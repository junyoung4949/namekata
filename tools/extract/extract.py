"""namekata 문제 추출기.

허용적 라이선스 저장소에서 파일을 커밋 해시로 고정해 받아온 뒤,
tree-sitter로 함수를 잘라내고 이름을 가려 문제 후보 JSON을 만든다.

설계 문서의 파이프라인 1~4단계에 해당한다. 5단계(사람 검수)는 웹 관리자
화면에서 하고, 여기서는 `status: "pending"` 으로만 내보낸다.

    python tools/extract/extract.py --out data/questions.json

추출기는 "식별자 하나와 그 모든 등장 위치를 가린다"는 일반 구조로 되어 있어,
대상만 바꾸면 변수·클래스로 확장할 수 있다 (extract_targets 참고).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

import tree_sitter_java
import tree_sitter_javascript
import tree_sitter_python
from tree_sitter import Language, Node, Parser

PLACEHOLDER = "___NAME___"

LANGUAGES = {
    "java": Language(tree_sitter_java.language()),
    "python": Language(tree_sitter_python.language()),
    "javascript": Language(tree_sitter_javascript.language()),
}

GITHUB_API = "https://api.github.com"
RAW = "https://raw.githubusercontent.com"


# ---------------------------------------------------------------- 가져오기


def _get(url: str, accept: str = "application/vnd.github+json") -> bytes:
    req = urllib.request.Request(url, headers={"Accept": accept, "User-Agent": "namekata-extract"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read()


def resolve_commit(repo: str) -> str:
    """저장소의 최신 커밋 해시. 문제는 이 해시로 고정해 출처를 증명한다."""
    data = json.loads(_get(f"{GITHUB_API}/repos/{repo}/commits?per_page=1"))
    return data[0]["sha"]


def fetch_file(repo: str, commit: str, path: str, quiet: bool = False) -> str | None:
    try:
        return _get(f"{RAW}/{repo}/{commit}/{path}", accept="text/plain").decode("utf-8")
    except urllib.error.HTTPError as exc:
        if not quiet:
            print(f"  건너뜀 {path}: HTTP {exc.code}", file=sys.stderr)
        return None


COPYRIGHT_RE = re.compile(r"Copyright\s+(?:\(c\)\s*)?[^\n*]*", re.IGNORECASE)


def read_copyright(source: str) -> str | None:
    """파일 헤더의 저작권 문구를 원문 그대로 가져온다."""
    head = source[:4000]
    match = COPYRIGHT_RE.search(head)
    if not match:
        return None
    return " ".join(match.group(0).split()).rstrip("*/ ").strip()


def read_repo_copyright(repo: str, commit: str) -> str | None:
    """파일 헤더에 저작권 문구가 없는 저장소를 위한 대비책.

    LICENSE / NOTICE 파일에서 문구를 읽는다. 문구를 지어내지 않기 위해,
    둘 다 없으면 None을 그대로 둔다 (검수 화면에서 사람이 채운다).
    """
    for path in ("NOTICE", "LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"):
        text = fetch_file(repo, commit, path, quiet=True)
        if text is None:
            continue
        found = read_copyright(text)
        if found and not _is_license_boilerplate(found):
            return found
    return None


# Apache 2.0 본문에 들어 있는 빈칸 문구. 실제 권리자가 아니므로 쓰면 안 된다.
BOILERPLATE_RE = re.compile(
    r"\[yyyy\]|\[name of copyright owner\]|owner or entity|the copyright owner", re.IGNORECASE
)


def _is_license_boilerplate(text: str) -> bool:
    return bool(BOILERPLATE_RE.search(text))


# ---------------------------------------------------------------- 대상 찾기


@dataclass
class Target:
    """가릴 식별자 하나와, 그 식별자가 속한 코드 조각."""

    name: str
    name_node: Node
    body_node: Node          # 문제로 보여줄 범위
    kind: str                # "method" | "variable" | "class"
    decorators: list[str] = field(default_factory=list)
    annotations: list[str] = field(default_factory=list)
    uses: int = 0            # 보여줄 범위 안에서 이름이 나오는 횟수 (변수 필터용)


def _text(node: Node, src: bytes) -> str:
    return src[node.start_byte : node.end_byte].decode("utf-8", "replace")


def _walk(node: Node):
    yield node
    for child in node.children:
        yield from _walk(child)


# 이름이 붙는 바깥 틀. 언어마다 노드 이름이 다르다.
OWNER_TYPES = (
    "class_declaration",
    "class_definition",
    "class",
    "interface_declaration",
    "enum_declaration",
    "record_declaration",
    "annotation_type_declaration",
)


def enclosing_owner(node: Node, src: bytes) -> str | None:
    """이 함수를 품고 있는 가장 안쪽 클래스·인터페이스 이름.

    어느 클래스의 메서드인지는 이름을 짓기 전에 알아야 하는 것이라
    문제에 같이 싣는다. 파일 바깥에 있는 이름이라 코드 조각만 봐서는
    알 수 없다 (Python의 PreparedRequest.prepare_body 같은 경우).
    """
    current = node.parent
    while current is not None:
        if current.type in OWNER_TYPES:
            name = current.child_by_field_name("name")
            if name is not None:
                return _text(name, src)
        current = current.parent
    return None


FUNCTION_NODES = {
    "java": ("method_declaration", "constructor_declaration"),
    "python": ("function_definition",),
    "javascript": (
        "function_declaration",
        "generator_function_declaration",
        "function_expression",
        "arrow_function",
        "method_definition",
    ),
}


def enclosing_function(node: Node, language: str) -> Node | None:
    """이 노드를 품은 가장 가까운 함수. 변수 문제의 보여줄 범위가 된다."""
    types = FUNCTION_NODES[language]
    current = node.parent
    while current is not None:
        if current.type in types:
            return current
        current = current.parent
    return None


def extract_variables(root: Node, src: bytes, language: str) -> list[Target]:
    """지역변수.

    함수 안에서 선언되고 쓰이는 것만 받는다. 선언과 사용처가 모두 한
    화면에 들어와야 문맥이 완결되고, mask() 의 누출 검사도 보여줄 범위
    안에서 끝난다. 필드·파라미터는 선언이 범위 밖이라 여기서 뺀다.
    """
    targets: list[Target] = []
    seen: set[tuple[str, int]] = set()

    if language == "java":
        node_type, field = "local_variable_declaration", "declarator"
    elif language == "javascript":
        node_type, field = "variable_declaration", None
    else:
        node_type, field = "assignment", None

    for node in _walk(root):
        names: list[Node] = []

        if language == "java":
            if node.type != node_type:
                continue
            for child in node.children_by_field_name(field):
                name = child.child_by_field_name("name")
                if name is not None:
                    names.append(name)

        elif language == "javascript":
            if node.type not in ("variable_declaration", "lexical_declaration"):
                continue
            for child in _walk(node):
                if child.type != "variable_declarator":
                    continue
                value = child.child_by_field_name("value")
                # 함수를 담은 변수는 이미 메서드 수집기가 가져간다.
                if value is not None and value.type in ("arrow_function", "function_expression"):
                    continue
                name = child.child_by_field_name("name")
                if name is not None and name.type == "identifier":
                    names.append(name)

        else:  # python
            if node.type != "assignment":
                continue
            left = node.child_by_field_name("left")
            # 튜플 언패킹(a, b = ...)은 이름 하나를 가려도 나머지가 문맥을
            # 흐린다. 단일 대상만 받는다.
            if left is not None and left.type == "identifier":
                names.append(left)

        for name in names:
            body = enclosing_function(name, language)
            if body is None:
                continue
            text = _text(name, src)
            # 같은 변수에 여러 번 대입하면 후보도 여러 번 잡힌다. 첫 것만 쓴다.
            key = (text, body.start_byte)
            if key in seen:
                continue
            seen.add(key)
            uses = sum(
                1
                for child in _walk(body)
                if child.type in ("identifier", "property_identifier")
                and _text(child, src) == text
            )
            targets.append(Target(text, name, body, "variable", uses=uses))

    return targets


def extract_targets(root: Node, src: bytes, language: str) -> list[Target]:
    """이름을 가릴 후보. 메서드와 지역변수를 뽑는다 (클래스는 아직)."""
    targets: list[Target] = []

    if language == "java":
        for node in _walk(root):
            if node.type != "method_declaration":
                continue
            name = node.child_by_field_name("name")
            if name is None:
                continue
            annotations = [
                _text(child, src)
                for child in _walk(node)
                if child.type in ("marker_annotation", "annotation")
                and child.start_byte < name.start_byte
            ]
            targets.append(
                Target(_text(name, src), name, node, "method", annotations=annotations)
            )

    elif language == "python":
        for node in _walk(root):
            if node.type != "function_definition":
                continue
            name = node.child_by_field_name("name")
            if name is None:
                continue
            decorators: list[str] = []
            outer = node
            if node.parent is not None and node.parent.type == "decorated_definition":
                outer = node.parent
                decorators = [
                    _text(child, src) for child in outer.children if child.type == "decorator"
                ]
            targets.append(Target(_text(name, src), name, node, "method", decorators=decorators))

    elif language == "javascript":
        for node in _walk(root):
            name = None
            if node.type in ("function_declaration", "generator_function_declaration"):
                name = node.child_by_field_name("name")
            elif node.type == "method_definition":
                name = node.child_by_field_name("name")
            elif node.type == "variable_declarator":
                # 이름이 선언이 아니라 할당에서 오는 경우 (const foo = () => {})
                value = node.child_by_field_name("value")
                if value is not None and value.type in ("arrow_function", "function_expression"):
                    name = node.child_by_field_name("name")
            if name is None or name.type not in ("identifier", "property_identifier"):
                continue
            targets.append(Target(_text(name, src), name, node, "method"))

    return targets + extract_variables(root, src, language)


# ---------------------------------------------------------------- 필터 (2단계)

JAVA_SKIP_NAMES = {"equals", "hashCode", "toString", "clone", "finalize", "main"}

# 접근자만 뺀다.
#
# JavaBeans 규약 때문에 boolean 프로퍼티 접근자가 isX 라서 is·has 까지 묶어
# 잘라내고 있었는데, 그러면 판단 함수(isPlainObject, hasOwnInPrototypeChain
# 같은)까지 같이 날아간다. 그쪽은 오히려 좋은 문제다.
#
# 진짜 접근자는 본문이 한두 줄이라 길이 기준(min_lines)에서 이미 걸린다.
# 규약으로 이름이 고정된 구현은 @Override 규칙이 잡는다.
JAVA_ACCESSOR_RE = re.compile(r"^(get|set)[A-Z]")
PY_SKIP_DECORATORS = ("@property", "@staticmethod", "@classmethod", "@abstractmethod")


# 뜻이 자리에서 오는 이름들. 원본이 무엇이든 "맞다/틀리다"를 말할 수 없어
# 문제로 쓰지 않는다 (루프 카운터는 i·j 라서 길이 기준에서 이미 걸리지만,
# idx·cnt 처럼 세 글자인 것들이 남는다).
VARIABLE_SKIP_NAMES = {
    "idx", "cnt", "num", "len", "tmp", "temp", "val", "var", "obj", "arr",
    "res", "ret", "out", "buf", "ctx", "err", "acc", "cur", "prev", "next",
    "item", "items", "data", "value", "values", "result", "results", "self",
    "args", "kwargs", "key", "keys", "line", "lines", "name", "names",
}

# 모두 대문자는 상수다. 값이 곧 뜻이라 코드만 보고 이름을 지을 수 없다.
CONSTANT_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")

# 끝이 숫자인 이름 (len1, len2, file1). 번호는 뜻이 아니라 순번이고,
# 짝이 되는 형제 변수가 대개 같은 코드 안에 안 가려진 채로 남아 있어
# 답이 그냥 보인다.
NUMBERED_RE = re.compile(r"\d$")


@dataclass
class Rejection:
    reason: str


def variable_filter(target: Target) -> Rejection | None:
    """변수 이름 문제로 쓸 만한지.

    함수 이름과 달리 변수는 "쓰이는 모습"이 유일한 단서다. 한 번만 쓰이면
    단서가 선언문 한 줄뿐이라 이름을 지을 근거가 없다.
    """
    name = target.name
    if name.lower() in VARIABLE_SKIP_NAMES:
        return Rejection("변수:자리로 뜻이 정해지는 관용 이름")
    if CONSTANT_RE.match(name):
        return Rejection("변수:상수 (값이 곧 뜻)")
    if NUMBERED_RE.search(name):
        return Rejection("변수:순번이 붙은 이름 (형제 변수가 답을 보여줌)")
    if target.uses < 3:
        return Rejection("변수:선언 뒤 거의 쓰이지 않아 단서가 없음")
    return None


def language_filter(target: Target, code: str, language: str) -> Rejection | None:
    name = target.name

    # 아래 언어별 규칙은 메서드 이름을 겨냥한 것들이다 (접근자 규약, 매직
    # 메서드, 비공개 헬퍼). 변수에 그대로 걸면 엉뚱한 이유로 잘리므로
    # 변수는 제 규칙만 보고 공통 길이 기준으로 넘어간다.
    if target.kind == "variable":
        rejection = variable_filter(target)
        if rejection is not None:
            return rejection
        return None if len(name) > 2 else Rejection("이름이 너무 짧아 추측이 무의미함")

    if language == "java":
        if name in JAVA_SKIP_NAMES:
            return Rejection("java:관용 메서드")
        if JAVA_ACCESSOR_RE.match(name):
            return Rejection("java:getter/setter")
        if any("@Override" in ann for ann in target.annotations):
            return Rejection("java:@Override (이름이 상위 타입에 고정됨)")

    elif language == "python":
        if name.startswith("__") and name.endswith("__"):
            return Rejection("python:매직 메서드")
        if any(dec.startswith(PY_SKIP_DECORATORS) for dec in target.decorators):
            return Rejection("python:데코레이터로 이름이 고정됨")
        if name.startswith("_"):
            return Rejection("python:비공개 헬퍼")

    elif language == "javascript":
        if max((len(line) for line in code.splitlines()), default=0) > 200:
            return Rejection("js:압축된 코드로 보임")
        if name in ("cb", "fn", "callback", "handler"):
            return Rejection("js:콜백 관용 이름")

    if len(name) <= 2:
        return Rejection("이름이 너무 짧아 추측이 무의미함")
    return None


# ---------------------------------------------------------------- 누출 제거 (3단계)


def _name_variants(name: str) -> list[str]:
    """camelCase / snake_case / kebab-case / 공백 표기를 모두 모은다."""
    words = split_words(name)
    joined = "".join(words)
    variants = {
        name,
        name.lower(),
        joined.lower(),
        "_".join(words).lower(),
        "-".join(words).lower(),
        " ".join(words).lower(),
    }
    return [v for v in variants if len(v) >= 3]


def split_words(name: str) -> list[str]:
    """camelCase·snake_case를 단어로 쪼갠다. 채점의 단어 일치 표시와 같은 규칙."""
    parts = re.split(r"[^A-Za-z0-9]+", name)
    words: list[str] = []
    for part in parts:
        if not part:
            continue
        words.extend(re.findall(r"[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[a-z0-9]+", part))
    return [w.lower() for w in words if w]


def _comment_ranges(node: Node) -> list[tuple[int, int]]:
    ranges = []
    for child in _walk(node):
        if child.type in ("comment", "line_comment", "block_comment"):
            ranges.append((child.start_byte, child.end_byte))
    return ranges


DOC_COMMENT_PREFIXES = ("/**", "///", "/*!")


def _preceding_doc_comment(node: Node, src: bytes) -> str | None:
    """함수 바로 앞에 붙은 Javadoc·JSDoc 블록.

    Java·JS는 설명이 함수 바깥에 있어서 코드 조각에는 들어오지 않는다.
    주석 보기로만 쓰므로 지울 필요는 없고 읽어 두기만 한다.
    """
    current = node
    # 선언을 감싸는 노드(변수 선언문, 데코레이터 등)까지 거슬러 올라간다.
    while current.parent is not None and current.prev_sibling is None:
        current = current.parent

    sibling = current.prev_sibling
    if sibling is None or sibling.type not in ("comment", "block_comment", "line_comment"):
        return None

    text = _text(sibling, src).strip()
    if not text.startswith(DOC_COMMENT_PREFIXES):
        return None
    return text


def _python_docstring_range(node: Node) -> tuple[int, int] | None:
    body = node.child_by_field_name("body")
    if body is None or not body.children:
        return None
    first = body.children[0]
    if first.type == "expression_statement" and first.children:
        inner = first.children[0]
        if inner.type == "string":
            return (first.start_byte, first.end_byte)
    return None


@dataclass
class Masked:
    """문제 본문과, 답이 샐 만한 자리들."""

    code: str
    docstring: str | None
    # 이름이 한 단어로 그대로 남았다. 답이 보이므로 문제로 쓸 수 없다.
    leaks: list[str] = field(default_factory=list)
    # 더 긴 이름의 일부로만 남았다. 답이 보이는지는 사람이 판단한다.
    warnings: list[str] = field(default_factory=list)


def _appears_as_word(needle: str, haystack: str) -> bool:
    """식별자 경계에서만 찾는다.

    통째로 찾으면 formatter 안의 format 까지 누출로 잡힌다. 이름이 짧은
    함수가 거의 다 탈락해서, 걸러진 103개 중 81개가 이 경우였다.
    """
    return re.search(rf"(?<![A-Za-z0-9_$]){re.escape(needle)}(?![A-Za-z0-9_$])", haystack) is not None


def mask(target: Target, src: bytes, language: str) -> Masked:
    """문제 본문을 만든다.

    이름이 나온 자리는 전부 PLACEHOLDER로 바꾸고, 주석·docstring과
    이름이 들어간 문자열 리터럴(로그 등)을 지운다.
    """
    node = target.body_node
    start, end = node.start_byte, node.end_byte
    edits: list[tuple[int, int, str]] = []

    # 설명 주석은 떼어내 따로 보관한다 (주석 보기로 제자리에 되돌린다).
    # Python은 함수 안 docstring, Java·JS는 함수 앞 주석 블록.
    docstring: str | None = None
    if language == "python":
        span = _python_docstring_range(node)
        if span is not None:
            docstring = src[span[0] : span[1]].decode("utf-8", "replace")
            edits.append((span[0], span[1], ""))
    else:
        docstring = _preceding_doc_comment(node, src)

    # 나머지 주석은 보관하지 않고 지우기만 한다 (답이 새는 통로다).
    for cstart, cend in _comment_ranges(node):
        edits.append((cstart, cend, ""))

    # 이름이 등장하는 모든 식별자 (선언 + 재귀 호출)
    for child in _walk(node):
        if child.type in ("identifier", "property_identifier", "type_identifier"):
            if _text(child, src) == target.name:
                edits.append((child.start_byte, child.end_byte, PLACEHOLDER))

    # 이름이 들어간 문자열 리터럴 (로그 문자열로 답이 새는 경로)
    variants = _name_variants(target.name)
    for child in _walk(node):
        if child.type in ("string", "string_literal", "template_string"):
            literal = _text(child, src).lower()
            if any(v in literal for v in variants):
                edits.append((child.start_byte, child.end_byte, '"..."'))

    edits.sort(key=lambda e: e[0], reverse=True)
    buffer = bytearray(src[start:end])
    applied_end = len(buffer) + start
    for estart, eend, replacement in edits:
        if estart < start or eend > applied_end:
            continue
        buffer[estart - start : eend - start] = replacement.encode("utf-8")

    # 잘라낸 조각의 첫 줄은 들여쓰기를 잃는다. 원본 줄의 앞 공백을 되살려
    # 전체를 같은 기준으로 맞춘 뒤 공통 들여쓰기를 걷어낸다.
    line_start = src.rfind(b"\n", 0, start) + 1
    indent = src[line_start:start].decode("utf-8", "replace")
    masked = buffer.decode("utf-8", "replace")
    if indent and not indent.strip():
        masked = indent + masked
    masked = _tidy(masked)

    # 이름이 한 단어로 남았으면 답이 그대로 보인다 (변수 이름이 타입에서 온
    # 경우가 그렇다 — StringJoiner stringJoiner). 더 긴 이름의 일부로만
    # 남은 것은 답이 보이지 않으니 버리지 않고 검수 화면으로 넘긴다.
    lowered = masked.lower()
    leaks = [v for v in variants if _appears_as_word(v, lowered)]
    warnings = [v for v in variants if v not in leaks and v in lowered]

    cleaned_doc = _clean_doc(docstring, target.name)
    if _doc_spells_answer(cleaned_doc, target.name):
        warnings.append("주석:정답 단어가 모두 들어 있음")

    return Masked(masked, cleaned_doc, leaks, warnings)


def _doc_spells_answer(doc: str | None, name: str) -> bool:
    """주석이 정답의 단어를 전부 담고 있는지.

    _clean_doc 이 이름과 그 표기 변형은 이미 가렸다. 그래도 단어가 흩어진
    채로 다 들어 있으면("Returns the prefix common to both") 주석을 여는
    순간 답을 받는다. 주석은 감점을 받고 여는 것이지 답을 받는 게 아니라
    경고를 달아 검수 화면으로 넘긴다.
    """
    if not doc:
        return False
    words = set(split_words(name))
    return bool(words) and words <= set(re.findall(r"[a-z]+", doc.lower()))


def _clean_doc(raw: str | None, name: str) -> str | None:
    """주석 보기로 되돌릴 설명 손질.

    주석 기호를 걷어내고, 설명 안에 그대로 적힌 이름은 가린다.
    주석은 감점을 받고 여는 것이지 답을 받는 게 아니다.
    """
    if not raw:
        return None

    text = raw.strip()
    if text.startswith(("'''", '"""')):
        text = text.strip("'\" \n")
    else:
        text = re.sub(r"^/\*+|\*+/$", "", text)
        text = "\n".join(
            re.sub(r"^\s*\*\s?|^\s*//+\s?", "", line) for line in text.splitlines()
        )

    text = re.sub(rf"\b{re.escape(name)}\b", PLACEHOLDER, text)
    for variant in _name_variants(name):
        text = re.sub(re.escape(variant), PLACEHOLDER, text, flags=re.IGNORECASE)

    lines = [line.rstrip() for line in text.splitlines()]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    cleaned = "\n".join(lines).strip()
    return cleaned or None


def _tidy(code: str) -> str:
    """주석을 지우고 남은 빈 줄·줄 끝 공백·공통 들여쓰기를 정리한다."""
    lines = [line.rstrip() for line in code.splitlines()]
    out: list[str] = []
    for line in lines:
        if not line.strip() and out and not out[-1].strip():
            continue
        out.append(line)
    while out and not out[0].strip():
        out.pop(0)
    while out and not out[-1].strip():
        out.pop()

    filled = [line for line in out if line.strip()]
    if filled:
        common = min(len(line) - len(line.lstrip()) for line in filled)
        if common:
            out = [line[common:] if line.strip() else line for line in out]
    return "\n".join(out)


# ---------------------------------------------------------------- 난이도

# lv 경계. 아래 estimate_level 의 원점수를 0~5로 접는 자리다.
#
# 원점수는 0~8까지 나올 수 있지만 실제 분포는 가운데에 몰린다. 경계를
# 균등하게 두면 lv0 과 lv5 가 비어서 여섯 단계를 쓰는 의미가 없어지므로,
# data/questions.json 의 실제 분포를 보고 양 끝을 좁혔다.
LEVEL_CUTS = (1, 2, 3, 4, 5)


def estimate_level(masked: str, language: str, name: str, kind: str, has_doc: bool) -> int:
    """lv0~lv5.

    실제로 풀어 본 사람이 없는 시점에도 모든 문제에 등급이 붙어야 하므로
    정적인 신호만 쓴다. 표본이 쌓이면 웹 쪽에서 실측으로 덮어쓴다
    (web/src/lib/level.ts 의 resolveLevel).

    신호는 "이름을 짓는 데 쓸 수 있는 단서가 얼마나 되는가"로 고른다.
    코드가 길수록·단어가 많을수록·타입이 없을수록 단서가 흐려진다.
    """
    score = 0

    # 길이. 짧으면 한눈에 들어오고, 길면 무엇을 요약해야 할지가 어렵다.
    lines = len(masked.splitlines())
    score += 0 if lines <= 14 else 1 if lines <= 22 else 2 if lines <= 32 else 3

    # 이름의 단어 수. 세 단어짜리 이름은 우연히 맞추기 어렵다.
    words = len(split_words(name))
    score += 0 if words <= 1 else 1 if words == 2 else 2

    # 타입이 없는 언어는 시그니처가 주는 단서가 없다.
    if language in ("python", "javascript"):
        score += 1

    # 변수는 함수보다 문맥이 적다. 함수는 시그니처와 반환값이 뜻을 말해
    # 주지만, 변수는 쓰이는 자리만 보고 알아내야 한다.
    if kind == "variable":
        score += 1

    # 주석을 열 수 있으면 (감점을 감수하고) 길이 있다.
    if has_doc:
        score -= 1

    return sum(score >= cut for cut in LEVEL_CUTS)


# ---------------------------------------------------------------- 파이프라인


def build_questions(
    source: dict,
    commit: str,
    path: str,
    text: str,
    min_lines: int,
    max_lines: int,
    fallback_copyright: str | None = None,
) -> tuple[list[dict], dict[str, int]]:
    language = source["language"]
    parser = Parser(LANGUAGES[language])
    src = text.encode("utf-8")
    tree = parser.parse(src)
    copyright_holder = read_copyright(text) or fallback_copyright

    questions: list[dict] = []
    stats: dict[str, int] = {}

    def drop(reason: str):
        stats[reason] = stats.get(reason, 0) + 1

    for target in extract_targets(tree.root_node, src, language):
        node = target.body_node
        line_count = node.end_point[0] - node.start_point[0] + 1
        if not (min_lines <= line_count <= max_lines):
            drop("길이 기준 벗어남")
            continue

        raw_code = _text(node, src)
        rejection = language_filter(target, raw_code, language)
        if rejection is not None:
            drop(rejection.reason)
            continue

        result = mask(target, src, language)
        if result.leaks:
            drop("이름 누출")
            continue
        if len(result.code.splitlines()) < min_lines:
            drop("주석 제거 후 너무 짧아짐")
            continue

        start_line = node.start_point[0] + 1
        end_line = node.end_point[0] + 1
        # 변수 문제는 품고 있는 함수를 그대로 보여주므로 그 함수의 메서드
        # 문제와 start_line 이 같다. id 가 부딪히지 않도록 변수 선언 줄을
        # 붙인다. 메서드 id 의 모양은 건드리지 않는다 — 이미 쌓인 제출과
        # 검수 기록이 그 id 를 가리키고 있다.
        qid = f"{source['repo'].replace('/', '-')}-{commit[:7]}-{start_line}"
        if target.kind == "variable":
            qid += f"v{target.name_node.start_point[0] + 1}"
        questions.append(
            {
                "id": qid,
                "language": language,
                "kind": target.kind,
                "answer": target.name,
                "answer_words": split_words(target.name),
                "masked_code": result.code,
                "placeholder": PLACEHOLDER,
                "owner": enclosing_owner(node, src),
                "docstring": result.docstring,
                "level": estimate_level(
                    result.code, language, target.name, target.kind, result.docstring is not None
                ),
                "status": "pending",
                # 사람이 봐야 할 자리. 빈 목록이면 자동 검사를 깨끗이 통과했다.
                # 검수 화면에서 이 문제를 먼저 보여주는 데 쓴다.
                "review_flags": result.warnings,
                "source": {
                    "repo": source["repo"],
                    "repo_url": f"https://github.com/{source['repo']}",
                    "commit_hash": commit,
                    "file_path": path,
                    "start_line": start_line,
                    "end_line": end_line,
                    "url": f"https://github.com/{source['repo']}/blob/{commit}/{path}#L{start_line}-L{end_line}",
                    "license": source["license"],
                    "copyright_holder": copyright_holder,
                },
            }
        )

    return questions, stats


def read_pinned_commits(path: str) -> dict[str, str]:
    """이미 만들어 둔 문제들이 쓰던 커밋 (저장소별).

    필터를 고쳐서 다시 뽑을 때 쓴다. 최신 커밋으로 옮겨가면 줄 번호가
    밀려 문제 id가 통째로 바뀌고, 지금까지 쌓인 제출·검수 기록이 어느
    문제 것인지 알 수 없게 된다.
    """
    commits: dict[str, str] = {}
    for question in json.loads(Path(path).read_text()):
        source = question["source"]
        commits.setdefault(source["repo"], source["commit_hash"])
    return commits


def read_pinned_ids(path: str) -> set[str]:
    """이미 만들어 둔 문제들의 id.

    파일당 상한을 적용할 때 이것들을 먼저 남긴다. 필터를 느슨하게 고치면
    후보가 늘어나는데, 늘어난 만큼 원래 있던 문제가 상한 밖으로 밀려난다.
    그러면 그 id를 가리키던 제출·검수 기록이 갈 곳을 잃는다.
    """
    return {question["id"] for question in json.loads(Path(path).read_text())}


def main() -> int:
    parser = argparse.ArgumentParser(description="namekata 문제 추출기")
    parser.add_argument("--sources", default=str(Path(__file__).with_name("sources.json")))
    parser.add_argument("--out", default="data/questions.json")
    parser.add_argument("--min-lines", type=int, default=10)
    parser.add_argument("--max-lines", type=int, default=40)
    # 파일 하나에서 너무 많이 가져오면 문제가 한쪽으로 쏠린다. 6은 지금
    # data/questions.json 을 만든 값이다 — 줄이면 뒤쪽 문제가 사라지므로
    # 이미 쌓인 제출이 어느 문제 것인지 알 수 없게 된다.
    parser.add_argument("--per-file", type=int, default=6, help="파일당 최대 메서드 문제 수")
    # 변수는 후보가 메서드보다 훨씬 많이 나온다. 같은 수로 두면 문제 목록이
    # 변수로 뒤덮여 한 파일에서 같은 함수가 몇 번씩 나온다.
    parser.add_argument(
        "--per-file-variable", type=int, default=3, help="파일당 최대 변수 문제 수"
    )
    parser.add_argument(
        "--pin-from",
        help="이미 만들어 둔 questions.json 의 커밋을 그대로 쓴다 "
        "(최신 커밋으로 옮겨가지 않으므로 문제 id가 유지된다)",
    )
    args = parser.parse_args()

    sources = json.loads(Path(args.sources).read_text())
    pinned = read_pinned_commits(args.pin_from) if args.pin_from else {}
    pinned_ids = read_pinned_ids(args.pin_from) if args.pin_from else set()
    all_questions: list[dict] = []
    all_stats: dict[str, int] = {}

    def keep(candidates: list[dict], limit: int) -> list[dict]:
        """상한만큼 남긴다. 이미 있던 문제가 밀려나지 않도록 먼저 집는다."""
        # 안정 정렬이라 기존 문제들끼리의 순서, 새 문제들끼리의 순서는 그대로다.
        candidates.sort(key=lambda question: question["id"] not in pinned_ids)
        return candidates[:limit]

    for source in sources:
        repo = source["repo"]
        if repo in pinned:
            commit = pinned[repo]
            print(f"[{repo}] 커밋 고정: {commit[:7]}")
        else:
            print(f"[{repo}] 커밋 해석 중…")
            try:
                commit = resolve_commit(repo)
            except Exception as exc:  # noqa: BLE001 - 저장소 하나가 실패해도 계속 간다
                print(f"  실패: {exc}", file=sys.stderr)
                continue
        repo_copyright = read_repo_copyright(repo, commit)
        print(f"  커밋 {commit[:7]} · 저작권 {repo_copyright or '(파일 헤더에서 찾음)'}")
        for path in source["paths"]:
            text = fetch_file(repo, commit, path)
            if text is None:
                continue
            questions, stats = build_questions(
                source, commit, path, text, args.min_lines, args.max_lines, repo_copyright
            )
            for reason, count in stats.items():
                all_stats[reason] = all_stats.get(reason, 0) + count
            # 종류별로 따로 자른다. 한 통에 담아 자르면 변수 후보가 늘어난
            # 만큼 메서드가 밀려나고, 밀려난 메서드의 id 를 가리키던 제출과
            # 검수 기록이 갈 곳을 잃는다.
            methods = keep([q for q in questions if q["kind"] == "method"], args.per_file)
            variables = keep(
                [q for q in questions if q["kind"] == "variable"], args.per_file_variable
            )
            kept = methods + variables
            all_questions.extend(kept)
            print(
                f"  {path}: 후보 {len(questions)}개 중 "
                f"{len(kept)}개 채택 (메서드 {len(methods)} · 변수 {len(variables)})"
            )

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(all_questions, ensure_ascii=False, indent=2) + "\n")

    print(f"\n문제 {len(all_questions)}개 → {out}")
    if all_stats:
        print("걸러진 이유:")
        for reason, count in sorted(all_stats.items(), key=lambda kv: -kv[1]):
            print(f"  {count:4d}  {reason}")

    flagged = [question for question in all_questions if question["review_flags"]]
    if flagged:
        print(f"\n검수 때 먼저 볼 문제 {len(flagged)}개 (답이 보이는지 사람이 판단):")
        counts: dict[str, int] = {}
        for question in flagged:
            for flag in question["review_flags"]:
                label = flag if flag.startswith("주석:") else "코드:더 긴 이름 안에 답이 들어 있음"
                counts[label] = counts.get(label, 0) + 1
        for label, count in sorted(counts.items(), key=lambda kv: -kv[1]):
            print(f"  {count:4d}  {label}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
