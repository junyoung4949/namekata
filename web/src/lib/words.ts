/**
 * 이름을 역할로 가르는 데 쓰는 닫힌 목록.
 *
 * 규칙이 아직 움직이는 중이라 데이터(questions.json)에 굳히지 않고 여기
 * 둔다. 목록을 한 줄 고치면 지난 문제·지난 답까지 같이 다시 칠해진다.
 *
 * 늘리는 방법: 검수 화면에서 색이 안 켜진 제출을 모아 보고, 진짜 동사인데
 * 빠진 것을 VERBS 에 넣는다. 기술 역할어는 문제 데이터의 owner(감싸는
 * 클래스) 이름 끝 단어를 모으면 초안이 나온다.
 */

/** 판정 접두사. 이름 맨 앞에서만 이 뜻이 된다. */
export const PREFIX = new Set(["is", "has", "should", "can", "will", "must", "was", "were"]);

/**
 * 판정 접두사 중 뒤에 동사가 따라오는 것들.
 *
 * shouldDisplayMessage 처럼 조동사 다음에는 동작이 온다. 반면 is·has 뒤는
 * 상태나 대상이라 동사가 아니다 — hasText 의 Text 는 핵심 명사다.
 */
export const MODAL = new Set(["should", "can", "will", "must"]);

/** 전치사. 맨 앞에 오면 전치사가 아니라 변환 동사다 (toJson) — VERBS_HEAD 참고. */
export const PREPOSITION = new Set([
  "by", "from", "to", "with", "of", "for", "in", "into", "on", "at", "as", "per",
  "between", "without", "before", "after", "until", "via", "over", "under", "through",
  "about", "against", "onto", "upon", "within",
]);

/** 수량·범위. 맨 뒤에 오면 수식이 아니라 그 자체가 핵심 명사다 (retryCount). */
export const QUANTITY = new Set([
  "all", "any", "each", "every", "first", "last", "next", "prev", "previous", "cur",
  "current", "max", "min", "total", "count", "num", "number", "single", "multi",
  "both", "most", "least", "one", "two", "many", "few", "some", "none",
]);

/** 기술 역할어. 도메인이 아니라 구조를 가리키는 말. */
export const TECHNICAL = new Set([
  "repository", "service", "dto", "vo", "impl", "factory", "manager", "controller",
  "entity", "mapper", "util", "utils", "helper", "adapter", "provider", "wrapper",
  "listener", "observer", "middleware", "interceptor", "resolver", "strategy",
  "delegate", "mixin", "builder", "handler", "decorator", "facade", "singleton",
  "proxy", "visitor", "iterator", "enumerator", "comparator",
]);

/**
 * 동사. 명사로는 거의 안 쓰이는 것들이라 이름 어디에 있든 동사로 본다.
 *
 * 이래야 userGet 처럼 순서가 뒤집힌 이름에서 색이 뒤에 켜진다.
 */
export const VERBS = new Set([
  "get", "set", "add", "remove", "delete", "create", "build", "make", "parse",
  "prepare", "extract", "decode", "encode", "merge", "apply", "compose", "send",
  "fetch", "read", "write", "raise", "throw", "repeat", "pad", "find",
  "bypass", "equals", "convert", "generate", "close", "reset", "append",
  "prepend", "replace", "trim", "strip", "validate", "verify",
  "compute", "calculate", "resolve", "register", "unregister", "subscribe",
  "publish", "emit", "dispatch", "invoke", "execute",
  "persist", "flush", "clear", "rename", "reverse",
  "normalize", "sanitize", "unescape", "serialize", "deserialize",
  "initialize", "init", "configure", "enable", "disable", "expand", "collapse",
  "wrap", "unwrap", "detect", "ensure", "assert", "require", "retry", "cancel",
  "abort", "resume", "submit", "upload", "download", "connect", "disconnect",
  "bind", "unbind", "attach", "detach", "mount", "unmount", "render", "notify",
  "choose", "pick", "collect", "gather", "lookup", "compare",
  "migrate", "restore", "compress", "decompress", "encrypt", "decrypt",
  "authenticate", "authorize", "iterate", "iter", "schedule", "throttle",
  "debounce", "truncate", "transform", "substring", "describe", "explain",
  "fail", "contains", "accept", "display", "traverse",
  "reject", "allow", "deny", "grant", "revoke", "refresh", "invalidate",
  "acquire",
  "await", "assign", "swap", "shift", "unshift", "drain",
]);

/**
 * 명사로도 흔한 말. 맨 앞(또는 판정 접두사 바로 뒤)에 있을 때만 동사로 본다.
 *
 * mergePropertiesIntoMap 의 Map 을 동사로 오인하지 않으려는 규칙이다.
 */
export const VERBS_HEAD = new Set([
  "to", "map", "match", "format", "stream", "open", "handle", "access", "request",
  "filter", "order", "process", "cache", "hash", "link", "mark", "index", "move",
  "show", "hide", "start", "stop", "run", "log", "group", "count", "sum", "search",
  "test", "select", "reduce", "buffer", "queue", "batch", "chunk", "slice",
  "round", "scale", "rotate", "translate", "sign", "trace",
  // 아래는 명사로 훨씬 자주 쓰여서 맨 앞에서만 동사로 본다.
  // securityCheck 의 Check, lastUpdate 의 Update 를 동작으로 오인하지 않으려는 것.
  "check", "copy", "clone", "split", "join", "sort", "insert", "update", "release",
  "lock", "unlock", "store", "load", "save", "scan", "print", "escape", "walk",
  "visit", "wait", "sleep", "poll", "listen", "push", "pop", "peek",
]);

/**
 * 경계 없이 붙여 쓴 이름(getuserbyid)을 쪼갤 때 쓰는 명사 사전.
 *
 * 위 목록들과 합쳐서 쓴다. 넉넉하지 않아도 되는 게, 쪼개기에 실패하면
 * 색을 안 칠하고 넘어가기 때문이다 — 잘못 쪼개는 것보다 그 편이 낫다.
 */
export const NOUNS = new Set([
  "user", "id", "name", "value", "key", "data", "item", "list", "map", "url", "uri",
  "path", "file", "dir", "line", "word", "char", "string", "text", "number", "index",
  "size", "length", "time", "date", "day", "month", "year", "request", "response",
  "header", "body", "param", "params", "query", "result", "error", "message",
  "status", "code", "token", "session", "cookie", "cache", "buffer", "stream",
  "chunk", "byte", "bit", "hash", "config", "option", "options", "flag", "level",
  "state", "mode", "type", "kind", "group", "role", "admin", "account", "profile",
  "email", "password", "address", "phone", "city", "country", "order", "product",
  "price", "amount", "total", "cart", "coupon", "payment", "invoice", "customer",
  "member", "post", "comment", "reply", "tag", "category", "image", "video", "audio",
  "font", "color", "style", "theme", "layout", "page", "view", "screen", "button",
  "form", "input", "field", "label", "title", "description", "content", "summary",
  "detail", "prefix", "suffix", "element", "node", "tree", "root", "child", "parent",
  "entry", "record", "row", "column", "table", "schema", "model", "version", "json",
  "xml", "html", "css", "api", "db", "sql", "http", "port", "host", "server",
  "client", "socket", "thread", "task", "job", "queue", "event", "action", "context",
  "scope", "range", "point", "rect", "size", "width", "height", "top", "bottom",
  "left", "right", "start", "end", "object", "array", "set", "pair", "tuple",
]);
