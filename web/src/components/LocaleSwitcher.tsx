"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { FilterDropdown, FilterOption } from "./FilterDropdown";

/**
 * 언어 선택.
 *
 * 생김새와 열고 닫는 동작은 목록 화면의 필터와 같은 FilterDropdown 을 쓴다.
 * 바깥 클릭·Esc·고른 뒤 닫기를 한 번 더 구현하지 않는다.
 *
 * 필터와 달리 버튼에 **고른 값**을 적는다. 필터는 고른 값을 아래 칩 줄이
 * 따로 보여 주지만, 여기는 그럴 자리가 없고 지금 무슨 언어인지가 이 버튼이
 * 알려 줄 유일한 정보다.
 */
export function LocaleSwitcher() {
  const t = useTranslations("common");
  // useLocale() 의 반환형은 string 이다. 이 컴포넌트는 [locale] 레이아웃 안에만
  // 있고 그 레이아웃이 hasLocale() 로 걸러 notFound() 를 내므로, 여기 닿은 값은
  // 이미 routing.locales 중 하나다.
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const label = { ko: t("korean"), en: t("english") } as const;

  return (
    <FilterDropdown label={label[locale]} align="right">
      {routing.locales.map((next) => (
        <button
          key={next}
          type="button"
          className="block w-full text-left"
          onClick={() =>
            // 현재 경로를 유지한 채 언어만 바꾼다. 문제 코드는 공통이고 UI만 바뀐다.
            router.replace(pathname, { locale: next })
          }
        >
          <FilterOption active={next === locale}>{label[next]}</FilterOption>
        </button>
      ))}
    </FilterDropdown>
  );
}
