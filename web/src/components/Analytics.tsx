import Script from "next/script";

/**
 * Google Analytics 4.
 *
 * NEXT_PUBLIC_GA_ID 가 없으면 아무것도 그리지 않는다 — 로컬 개발과 CI 에서는
 * 저절로 꺼진다. 켜려면 deploy/.env 에 측정 ID(G-XXXXXXXXXX)를 넣는다.
 *
 * 알아 둘 것: 이 사이트의 방문자는 거의 개발자이고, 광고 차단기가
 * google-analytics.com 을 1순위로 막는다. 숫자가 실제보다 적게 나오며
 * **얼마나 적은지는 알 수 없다.** 추세를 보는 데는 쓸 수 있지만 절대값으로
 * 믿으면 안 된다.
 *
 * "사람이 실제로 썼나"의 답은 여기가 아니라 DB 의 submissions 에 있다. 봇은
 * 빈칸에 이름을 쳐 넣지 않는다 (deploy/stats.sh 참고).
 */
export function Analytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (!id) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          // IP 를 마지막 옥텟까지 저장하지 않게 한다. 방문자 수를 세는 데
          // 전체 IP 가 필요하지 않다.
          gtag('config', '${id}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
