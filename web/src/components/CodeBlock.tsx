import { Fragment } from "react";
import type { CommentBlock } from "@/lib/comment";
import type { DocStyle, Highlighted, HighlightedLine, Token as CodeToken } from "@/lib/highlight";

/**
 * 빈칸에 직접 이름을 치게 할 때 넘기는 것들.
 *
 * 빈칸이 여러 개인 문제(재귀 호출 등)에서는 값을 하나로 묶는다. 한 곳에
 * 치면 나머지 자리도 같이 바뀐다 — 에디터에서 이름을 바꾸는 것과 같다.
 */
export type SlotInput = {
  value: string;
  onChange: (value: string) => void;
  /** 첫 빈칸에만 붙는다. 화면을 열자마자 여기에 커서를 둔다. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  label: string;
};

/**
 * 문법 강조가 들어간 코드.
 *
 * 토큰과 에디터 색은 서버에서 만들어 내려온다 (lib/highlight.ts).
 * 배경·거터·괄호·가이드 색은 언어마다 다르므로(Java는 IntelliJ, 나머지는
 * VS Code) 전역 CSS 변수로 두지 않고 여기서 블록마다 심는다. 밝은 쪽과
 * 어두운 쪽을 둘 다 넘기고, 어느 쪽을 쓸지는 globals.css의 미디어 쿼리가
 * 고른다.
 */
export function CodeBlock({
  highlighted,
  placeholder,
  slotLength,
  reveal,
  comment,
  input,
  path,
  owner,
}: {
  highlighted: Highlighted;
  placeholder: string;
  /** 가려진 이름의 글자 수. 빈칸을 이만큼 그린다. */
  slotLength: number;
  reveal?: string;
  /** 되살린 원본 주석. 원래 있던 자리에 끼워 넣는다 (lib/comment.ts). */
  comment?: CommentBlock | null;
  /** 주면 빈칸이 입력창이 된다. 답을 공개한 뒤에는 주지 않는다. */
  input?: SlotInput;
  /**
   * 원본 파일 경로. 주면 에디터 탭처럼 코드 위에 붙인다.
   *
   * 어느 클래스·모듈에 있던 메서드인지는 이름을 짓기 전에 알아야 하는
   * 것이다 (StringUtils 인지 ObjectUtils 인지에 따라 지을 이름이 다르다).
   */
  path?: string;
  /** 감싸는 클래스 이름. 파일 이름으로 알 수 없을 때만 탭에 덧붙인다. */
  owner?: string | null;
}) {
  const { indentUnit, colors } = highlighted;
  const lines = merge(highlighted.lines, comment, colors.doc);
  const width = String(lines.length).length;

  // 빈칸 번호는 그리기 전에 다 매겨 둔다 (아래 numberSlots).
  const slots = numberSlots(lines, placeholder);

  const themeVars = {
    "--cb-bg-light": colors.background.light,
    "--cb-bg-dark": colors.background.dark,
    "--cb-gutter-bg-light": colors.gutterBackground.light,
    "--cb-gutter-bg-dark": colors.gutterBackground.dark,
    "--cb-gutter-fg-light": colors.gutterForeground.light,
    "--cb-gutter-fg-dark": colors.gutterForeground.dark,
    "--cb-guide-light": colors.indentGuide.light,
    "--cb-guide-dark": colors.indentGuide.dark,
    "--cb-decl-light": colors.declaration.light,
    "--cb-decl-dark": colors.declaration.dark,
    "--cb-indent": `${indentUnit}ch`,
    "--cb-br0-light": colors.brackets.light[0],
    "--cb-br1-light": colors.brackets.light[1],
    "--cb-br2-light": colors.brackets.light[2],
    "--cb-br0-dark": colors.brackets.dark[0],
    "--cb-br1-dark": colors.brackets.dark[1],
    "--cb-br2-dark": colors.brackets.dark[2],
  } as React.CSSProperties;

  return (
    <div className="code-frame rounded-lg border border-border" style={themeVars}>
      {path && <FileTab path={path} owner={owner} />}
      <pre className="code-block overflow-x-auto py-4">
      <code>
        {lines.map((line, index) => (
          <span key={index} className="code-line">
            <span className="code-ln" style={{ width: `${width + 1}ch` }}>
              {index + 1}
            </span>
            {/* 들여쓰기 가이드가 줄 앞 공백을 대신 그린다. */}
            {Array.from({ length: line.guides }, (_, level) => (
              <span key={level} className="indent-guide">
                {" ".repeat(indentUnit)}
              </span>
            ))}
            {line.indentRest}
            {line.tokens.map((token, tokenIndex) => (
              <Token
                key={tokenIndex}
                token={token}
                placeholder={placeholder}
                slotLength={slotLength}
                reveal={reveal}
                input={input}
                firstSlot={slots[index][tokenIndex]}
              />
            ))}
            {"\n"}
          </span>
        ))}
      </code>
      </pre>
    </div>
  );
}

/**
 * 에디터 탭.
 *
 * 파일 이름을 앞에 두고 디렉터리를 뒤에 흐리게 붙인다. 좁은 화면에서
 * 줄어드는 쪽은 디렉터리다 — 어디에 있던 코드인지가 먼저다.
 *
 * Java처럼 파일 이름이 곧 클래스 이름이면 그대로 두고, Python·JS처럼
 * 파일 하나에 여러 클래스가 있을 수 있으면 클래스 이름을 덧붙인다.
 */
function FileTab({ path, owner }: { path: string; owner?: string | null }) {
  const cut = path.lastIndexOf("/");
  const dir = cut < 0 ? "" : path.slice(0, cut);
  const file = cut < 0 ? path : path.slice(cut + 1);
  const base = file.replace(/\.[^.]+$/, "");

  return (
    <div className="code-tab mono">
      <span className="code-tab-file">{file}</span>
      {owner && owner !== base && (
        <span className="code-tab-owner">
          <span aria-hidden="true">›</span> {owner}
        </span>
      )}
      {dir && <span className="code-tab-dir">{dir}</span>}
    </div>
  );
}

/**
 * 토큰마다 그 토큰의 첫 빈칸이 문제 전체에서 몇 번째인지.
 *
 * 커서는 첫 빈칸에만 둬야 해서 번호가 필요하다. 그리면서 세면 렌더 도중에
 * 바깥 변수를 고치게 되는데, React가 자식 배열을 다시 평가하면 같은 토큰이
 * 두 번 세어져 번호가 어긋난다. 그리기 전에 한 번 훑어 표로 만들어 둔다.
 *
 * 훑는 순서는 그리는 순서와 같다 — 줄 순서대로, 줄 안에서는 토큰 순서대로.
 */
function numberSlots(lines: HighlightedLine[], placeholder: string): number[][] {
  let seen = 0;
  return lines.map((line) =>
    line.tokens.map((token) => {
      const first = seen;
      seen += token.content.split(placeholder).length - 1;
      return first;
    }),
  );
}

/**
 * 되살린 주석을 코드 줄 사이에 끼워 넣는다.
 *
 * 주석도 코드와 똑같이 한 줄씩 그린다. 줄 번호가 이어지고 들여쓰기
 * 가이드도 그대로 지나가서, 주석이 원래부터 거기 있던 것처럼 보인다.
 * 색은 테마가 그 자리에 쓰는 색을 토큰에 직접 심는다 (lib/highlight.ts의
 * doc). 주석 안에 가려진 이름이 들어 있으면 코드와 같은 빈칸으로 나온다.
 */
function merge(lines: HighlightedLine[], comment: CommentBlock | null | undefined, doc: DocStyle) {
  if (!comment) return lines;

  const style: Record<string, string> = {
    "--shiki-light": doc.light,
    "--shiki-dark": doc.dark,
    ...(doc.italic ? { fontStyle: "italic" } : {}),
  };
  const inserted = comment.lines.map((line) => ({
    guides: line.guides,
    indentRest: line.indentRest,
    tokens: [{ content: line.text, style }],
  }));

  return [
    ...lines.slice(0, comment.at),
    ...inserted,
    ...lines.slice(comment.at + comment.replace),
  ];
}

/**
 * 가려진 이름 자리.
 *
 * 이름은 여기에 직접 친다. 코드에서 눈을 떼지 않고 이름을 지어 넣는 것이
 * 이 사이트가 시키려는 일이라, 입력창을 코드 밖에 두지 않는다.
 *
 * 폭은 원본 이름의 글자 수만큼 잡는다. 길이가 드러나는 대신 코드의 가로
 * 정렬이 실제 이름과 같아져서, 답을 공개해도 뒤따르는 코드가 밀리지
 * 않는다. 그보다 긴 이름을 치면 친 만큼 늘어난다 — 에디터에서도 그렇고,
 * 잘라내면 자기가 무엇을 쳤는지 보이지 않는다.
 */
function Slot({
  length,
  reveal,
  input,
  index,
}: {
  length: number;
  reveal?: string;
  input?: SlotInput;
  /** 이 문제에서 몇 번째 빈칸인지 */
  index: number;
}) {
  if (reveal) {
    return <span className="slot slot--revealed">{reveal}</span>;
  }

  if (input) {
    return (
      <input
        ref={index === 0 ? input.inputRef : undefined}
        value={input.value}
        onChange={(event) => input.onChange(event.target.value)}
        className={`slot slot--input${input.value ? " slot--typed" : ""}`}
        style={{ width: `${Math.max(1, length, input.value.length)}ch` }}
        size={1}
        aria-label={`${input.label} (${length}글자)`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="go"
      />
    );
  }

  return (
    <span
      className="slot slot--hidden"
      style={{ width: `${Math.max(1, length)}ch` }}
      aria-label={`${length}글자`}
    />
  );
}

/**
 * 토큰 하나. 빈칸 표시가 토큰 안에 섞여 있을 수 있어 쪼개서 그린다
 * (보통은 토큰 하나로 잡히지만, 앞뒤 기호와 붙는 경우가 있다).
 */
function Token({
  token,
  placeholder,
  slotLength,
  reveal,
  input,
  firstSlot,
}: {
  token: CodeToken;
  placeholder: string;
  slotLength: number;
  reveal?: string;
  input?: SlotInput;
  /** 이 토큰의 첫 빈칸이 문제 전체에서 몇 번째인지 */
  firstSlot: number;
}) {
  const { content, style, bracket } = token;
  const className = bracket === undefined ? undefined : `bracket bracket-${bracket}`;

  if (!content.includes(placeholder)) {
    return (
      <span className={className} style={style as React.CSSProperties}>
        {content}
      </span>
    );
  }

  const parts = content.split(placeholder);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part && (
            <span className={className} style={style as React.CSSProperties}>
              {part}
            </span>
          )}
          {index < parts.length - 1 && (
            <Slot
              length={slotLength}
              reveal={reveal}
              input={input}
              index={firstSlot + index}
            />
          )}
        </Fragment>
      ))}
    </>
  );
}
