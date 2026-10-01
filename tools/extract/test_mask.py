"""mask() 가 문제를 제대로 만드는지 확인한다.

    .venv/bin/pytest tools/extract

mask() 는 네트워크도 저장소도 타지 않는다. 코드 문자열을 넣으면 가려진
코드가 나오는 함수라, 손으로 쓴 조각만으로 전부 확인할 수 있다.

확인하는 것은 두 가지다.

- **답이 새지 않는가**: 깨지면 답이 보이는 문제가 나간다
- **멀쩡한 문제를 버리지 않는가**: 깨지면 문제가 조용히 사라진다

둘째가 덜 무섭게 들리지만 실제로 더 많이 일어난다. 추출기가 문제를
버릴 때는 아무 흔적이 남지 않기 때문이다.
"""

from __future__ import annotations

import pytest
from tree_sitter import Parser

from extract import LANGUAGES, PLACEHOLDER, extract_targets, mask


def mask_of(language: str, code: str, name: str, kind: str = "method"):
    """코드 조각에서 이름 하나를 골라 가린다. 테스트마다 쓰는 준비 과정."""
    src = code.encode()
    tree = Parser(LANGUAGES[language]).parse(src)
    for target in extract_targets(tree.root_node, src, language):
        if target.name == name and target.kind == kind:
            return mask(target, src, language)
    raise AssertionError(f"대상을 찾지 못했다: {name} ({kind})")


# ------------------------------------------------------------ 답이 새지 않는가


def test_선언과_재귀_호출이_모두_가려진다():
    """이름이 여러 번 나오는 함수. 선언만 가리고 호출을 놓치면 답이 보인다."""
    result = mask_of(
        "python",
        """
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
""",
        "factorial",
    )
    assert "factorial" not in result.code
    assert result.code.count(PLACEHOLDER) == 2


def test_로그_문자열로_답이_새지_않는다():
    """로그에 함수 이름을 적어 두는 코드가 흔하다. 문자열째로 지워야 한다."""
    result = mask_of(
        "java",
        """
class X {
    void flushBuffer() {
        log.debug("flushBuffer called");
        buffer.clear();
        cursor = 0;
    }
}
""",
        "flushBuffer",
    )
    assert "flushbuffer" not in result.code.lower()
    assert '"..."' in result.code


def test_주석은_코드에서_사라진다():
    """주석은 답이 새는 통로다. 문제 본문에 남아서는 안 된다."""
    result = mask_of(
        "java",
        """
class X {
    void flushBuffer() {
        // 버퍼를 비우고 커서를 처음으로 돌린다
        buffer.clear();
        cursor = 0;
    }
}
""",
        "flushBuffer",
    )
    assert "커서를 처음으로" not in result.code


def test_docstring은_본문에서_떼어내_따로_돌려준다():
    """파이썬 설명문은 지우기만 하면 안 된다. 주석 보기로 되돌려야 한다."""
    result = mask_of(
        "python",
        '''
def normalize_path(raw):
    """Collapse redundant separators in a path."""
    parts = [p for p in raw.split("/") if p]
    return "/".join(parts)
''',
        "normalize_path",
    )
    assert "Collapse" not in result.code
    assert result.docstring is not None
    assert "Collapse redundant separators" in result.docstring


def test_주석_보기에서도_이름은_가려진다():
    """주석은 감점을 받고 여는 것이지 답을 받는 게 아니다."""
    result = mask_of(
        "python",
        '''
def normalize_path(raw):
    """normalize_path collapses redundant separators."""
    parts = [p for p in raw.split("/") if p]
    return "/".join(parts)
''',
        "normalize_path",
    )
    assert result.docstring is not None
    assert "normalize_path" not in result.docstring
    assert PLACEHOLDER in result.docstring


def test_타입_이름과_같은_변수는_누출로_잡는다():
    """변수 이름이 타입에서 온 경우. 타입은 안 가려지므로 답이 그대로 보인다.

    실제로 ObjectUtils.java 의 stringJoiner 가 이렇게 걸러졌다.
    """
    result = mask_of(
        "java",
        """
class X {
    String join(Object[] parts) {
        StringJoiner stringJoiner = new StringJoiner(", ");
        for (Object p : parts) {
            stringJoiner.add(String.valueOf(p));
        }
        return stringJoiner.toString();
    }
}
""",
        "stringJoiner",
        kind="variable",
    )
    assert "StringJoiner" in result.code  # 타입은 남는다
    assert result.leaks  # 그래서 문제로 쓸 수 없다


# -------------------------------------------------- 멀쩡한 문제를 버리지 않는가


def test_더_긴_이름의_일부로_나오는_것은_누출이_아니다():
    """format 을 가렸는데 formatter 가 남아 있어도 답은 보이지 않는다.

    "formatter 안에 format 이라는 글자가 있다"는 이유로 버리면, 이름이
    짧은 함수는 거의 다 탈락한다. 걸러진 103개 중 81개가 이 경우였다.
    """
    result = mask_of(
        "java",
        """
class X {
    String format(String raw, int width) {
        StringBuilder formatter = new StringBuilder();
        for (int i = 0; i < raw.length(); i++) {
            formatter.append(raw.charAt(i));
            if (i % width == 0) {
                formatter.append('\\n');
            }
        }
        return formatter.toString();
    }
}
""",
        "format",
    )
    assert "formatter" in result.code
    assert result.leaks == []


# ------------------------------------------------------------------- 보기 좋은가


def test_공통_들여쓰기가_걷힌다():
    """클래스 안에서 잘라낸 조각은 앞 공백이 남는다. 기준을 맞춰 걷어낸다."""
    result = mask_of(
        "java",
        """
class X {
    String join(Object[] parts) {
        StringBuilder out = new StringBuilder();
        for (Object p : parts) {
            out.append(p);
        }
        return out.toString();
    }
}
""",
        "join",
    )
    lines = result.code.splitlines()
    assert not lines[0].startswith(" ")  # 첫 줄은 왼쪽에 붙는다
    assert lines[1].startswith("    ")  # 안쪽 줄의 들여쓰기는 살아 있다


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
