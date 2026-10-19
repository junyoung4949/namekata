import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * 장 본문의 산문 부분.
 *
 * 코드 펜스는 여기 오지 않는다. 서버에서 먼저 떼어 내 shiki 로 토큰화하고
 * (lib/chapter.ts), 남은 산문만 들어온다. 그래서 여기서 다룰 코드는
 * 인라인 `code` 뿐이다.
 *
 * 표가 필요해서 GFM 을 켠다 — 구글 가이드의 "올바름 / 틀림" 표가 그것이다.
 */
export function Prose({ children }: { children: string }) {
  return (
    <div className="prose-ko">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 표는 좁은 화면에서 자기 안에서만 가로로 밀리게 한다.
          table: ({ children }) => (
            <div className="prose-scroll">
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => (
            <a href={href} {...external(href)}>
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/**
 * 바깥으로 나가는 링크만 새 탭으로.
 *
 * 가이드 안의 링크(/guide/...)는 같은 탭에서 따라가야 한다. 해설이
 * 다른 장을 가리킬 때 탭이 쌓이면 읽던 자리를 잃는다.
 */
function external(href?: string) {
  if (!href || href.startsWith("/") || href.startsWith("#")) return {};
  return { target: "_blank", rel: "noreferrer noopener" };
}
