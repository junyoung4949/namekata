# 네이밍 치트시트 (한국어 번역)

원문: [kettanaito/naming-cheatsheet](https://github.com/kettanaito/naming-cheatsheet)

- [영어 사용](#영어-사용)
- [네이밍 관례](#네이밍-관례)
- [S-I-D](#s-i-d)
- [축약하지 않기](#축약하지-않기)
- [맥락 중복 피하기](#맥락-중복-피하기)
- [기대하는 결과를 그대로 반영하기](#기대하는-결과를-그대로-반영하기)
- [함수 이름 짓기](#함수-이름-짓기)
  - [A/HC/LC 패턴](#ahclc-패턴)
    - [동작(Actions)](#동작actions)
    - [맥락(Context)](#맥락context)
    - [접두사(Prefixes)](#접두사prefixes)
- [단수와 복수](#단수와-복수)

---

이름 짓기는 어렵다. 이 문서는 그 일을 조금 더 쉽게 만들어 보려는 시도다.

여기 담긴 제안들은 어떤 프로그래밍 언어에도 적용할 수 있지만, 실제 예시는 자바스크립트로 보여주겠다.

## 영어 사용

변수와 함수의 이름을 지을 때는 영어를 쓴다.

```js
/* 나쁜 예 */
const primerNombre = 'Gustavo'
const amigos = ['Kate', 'John']

/* 좋은 예 */
const firstName = 'Gustavo'
const friends = ['Kate', 'John']
```

> 좋든 싫든 영어는 프로그래밍의 지배적인 언어다. 모든 프로그래밍 언어의 문법이 영어로 쓰여 있고, 수없이 많은 문서와 학습 자료도 그렇다. 코드를 영어로 쓰면 코드의 응집성이 극적으로 높아진다.

## 네이밍 관례

네이밍 관례를 **하나** 골라서 그것을 따른다. `camelCase`든 `PascalCase`든 `snake_case`든 그 밖의 무엇이든, 일관되게 유지되기만 하면 된다. 많은 프로그래밍 언어가 네이밍 관례에 관한 자체 전통을 갖고 있다. 쓰는 언어의 문서를 확인하거나 깃허브의 인기 저장소를 살펴보자!

```js
/* 나쁜 예 */
const page_count = 5
const shouldUpdate = true

/* 좋은 예 */
const pageCount = 5
const shouldUpdate = true

/* 이것도 좋은 예 */
const page_count = 5
const should_update = true
```

## S-I-D

이름은 _짧고(short)_, _직관적이고(intuitive)_, _설명적(descriptive)_이어야 한다.

- **짧게(Short).** 이름은 타이핑하는 데 오래 걸리지 않아야 하고, 따라서 기억하기도 쉬워야 한다.
- **직관적으로(Intuitive).** 이름은 자연스럽게 읽혀야 한다. 일상적인 말투에 최대한 가깝게.
- **설명적으로(Descriptive).** 이름은 그것이 무엇을 하는지/무엇을 담고 있는지를 가장 효율적인 방식으로 드러내야 한다.

```js
/* 나쁜 예 */
const a = 5 // "a" 는 무엇이든 될 수 있다
const isPaginatable = a > 10 // "Paginatable" 은 극도로 부자연스럽게 들린다
const shouldPaginatize = a > 10 // 없는 동사 만들어 쓰기, 참 재미있지!

/* 좋은 예 */
const postCount = 5
const hasPagination = postCount > 10
const shouldPaginate = postCount > 10 // 이렇게 써도 된다
```

## 축약하지 않기

단어를 축약해서 쓰지 **않는다**. 축약은 코드의 가독성을 떨어뜨리는 것 말고는 아무 기여도 하지 않는다. 짧으면서 설명적인 이름을 찾는 일은 어려울 수 있지만, 그것이 어렵다는 게 축약해도 된다는 변명이 되지는 않는다.

```js
/* 나쁜 예 */
const onItmClk = () => {}

/* 좋은 예 */
const onItemClick = () => {}
```

## 맥락 중복 피하기

이름은 그것이 정의된 맥락을 중복해서 담지 않아야 한다. 이름에서 맥락을 제거해도 가독성이 떨어지지 않는다면, 항상 제거한다.

```js
class MenuItem {
  /* 메서드 이름이 맥락("MenuItem")을 중복한다 */
  handleMenuItemClick = (event) => { ... }

  /* `MenuItem.handleClick()` 으로 보기 좋게 읽힌다 */
  handleClick = (event) => { ... }
}
```

## 기대하는 결과를 그대로 반영하기

이름은 기대하는 결과를 반영해야 한다.

```jsx
/* 나쁜 예 */
const isEnabled = itemCount > 3
return <Button disabled={!isEnabled} />

/* 좋은 예 */
const isDisabled = itemCount <= 3
return <Button disabled={isDisabled} />
```

---

# 함수 이름 짓기

## A/HC/LC 패턴

함수 이름을 지을 때 따라 볼 만한 유용한 패턴이 있다.

```
접두사? + 동작(A) + 상위 맥락(HC) + 하위 맥락?(LC)
```

이 패턴이 실제로 어떻게 적용되는지 아래 표를 보자.

| 이름 | 접두사(Prefix) | 동작 A (Action) | 상위 맥락 HC (High context) | 하위 맥락 LC (Low context) |
| --- | --- | --- | --- | --- |
| `getUser` | | `get` | `User` | |
| `getUserMessages` | | `get` | `User` | `Messages` |
| `handleClickOutside` | | `handle` | `Click` | `Outside` |
| `shouldDisplayMessage` | `should` | `Display` | `Message` | |

> **참고:** 맥락의 순서가 변수의 의미를 바꾼다. 예를 들어 `shouldUpdateComponent`는 _당신이_ 컴포넌트를 업데이트하려 한다는 뜻이고, `shouldComponentUpdate`는 _컴포넌트가_ 스스로 업데이트할 것이며 당신은 그 _시점_만 통제한다는 뜻이다.
> 다시 말해, **상위 맥락이 변수의 의미를 결정한다.**

---

## 동작(Actions)

함수 이름의 동사 부분. 그 함수가 무엇을 _하는지_ 설명하는, 가장 중요한 부분이다.

### `get`

데이터에 즉시 접근한다(즉, 내부 데이터를 꺼내는 짧은 게터).

```js
function getFruitCount() {
  return this.fruits.length
}
```

> [compose](#compose)도 함께 보라.

비동기 작업을 할 때도 `get`을 쓸 수 있다.

```js
async function getUser(id) {
  const user = await fetch(`/api/user/${id}`)
  return user
}
```

### `set`

변수를 선언적인 방식으로 설정한다. 값 `A`에서 값 `B`로.

```js
let fruits = 0

function setFruits(nextFruits) {
  fruits = nextFruits
}

setFruits(5)
console.log(fruits) // 5
```

### `reset`

변수를 초기 값이나 초기 상태로 되돌린다.

```js
const initialFruits = 5
let fruits = initialFruits
setFruits(10)
console.log(fruits) // 10

function resetFruits() {
  fruits = initialFruits
}

resetFruits()
console.log(fruits) // 5
```

### `remove`

무언가를 어딘가_에서_ 꺼낸다.

예를 들어 검색 페이지에 선택된 필터들의 모음이 있다면, 그중 하나를 모음에서 빼내는 것은 `removeFilter`이며 `deleteFilter`가 **아니다**(영어에서도 자연스럽게 그렇게 말한다).

```js
function removeFilter(filterName, filters) {
  return filters.filter((name) => name !== filterName)
}

const selectedFilters = ['price', 'availability', 'size']
removeFilter('price', selectedFilters)
```

> [delete](#delete)도 함께 보라.

### `delete`

무언가를 존재의 영역에서 완전히 지워 버린다.

당신이 콘텐츠 편집자이고, 없애 버리고 싶은 악명 높은 게시물이 하나 있다고 상상해 보자. 반짝이는 "게시물 삭제" 버튼을 누른 순간 CMS가 수행한 동작은 `deletePost`이며, `removePost`가 **아니다**.

```js
function deletePost(id) {
  return database.find({ id }).delete()
}
```

> [remove](#remove)도 함께 보라.

> **`remove`인가 `delete`인가?**
>
> `remove`와 `delete`의 차이가 그다지 분명하게 느껴지지 않는다면, 각각의 반대 동작인 `add`와 `create`를 보라고 권하고 싶다.
> `add`와 `create`의 핵심 차이는, `add`에는 목적지가 필요하지만 `create`에는 목적지가 **필요하지 않다**는 점이다. 당신은 어떤 항목을 _어딘가에_ `add`하지만, 그것을 _어딘가에_ "`create`"하지는 않는다.
> 그냥 `remove`는 `add`와, `delete`는 `create`와 짝지어 생각하면 된다.
>
> 자세한 설명은 [여기](https://github.com/kettanaito/naming-cheatsheet/issues/74#issue-1174942962)에 있다.

### `compose`

기존 데이터로부터 새 데이터를 만든다. 주로 문자열, 객체, 함수에 적용된다.

```js
function composePageUrl(pageName, pageId) {
  return pageName.toLowerCase() + '-' + pageId
}
```

> [get](#get)도 함께 보라.

### `handle`

어떤 동작을 처리한다. 콜백 메서드의 이름을 지을 때 자주 쓴다.

```js
function handleLinkClick() {
  console.log('Clicked a link!')
}

link.addEventListener('click', handleLinkClick)
```

---

## 맥락(Context)

함수가 다루는 영역(domain).

함수는 대개 _무언가_에 대한 동작이다. 그 함수가 다루는 영역이 무엇인지, 적어도 어떤 데이터 타입을 기대하는지 밝히는 것이 중요하다.

```js
/* 원시값을 다루는 순수 함수 */
function filter(list, predicate) {
  return list.filter(predicate)
}

/* 정확히 posts 를 다루는 함수 */
function getRecentPosts(posts) {
  return filter(posts, (post) => post.date === Date.now())
}
```

> 언어에 따라 당연히 전제되는 것이 있다면 맥락을 생략할 수 있다. 예를 들어 자바스크립트에서는 `filter`가 배열을 다루는 것이 일반적이다. 굳이 `filterArray`라고 명시하는 것은 불필요하다.

---

## 접두사(Prefixes)

접두사는 변수의 의미를 강화한다. 함수 이름에는 거의 쓰이지 않는다.

### `is`

현재 맥락의 특성이나 상태를 설명한다(보통 `boolean`).

```js
const color = 'blue'
const isBlue = color === 'blue' // 특성
const isPresent = true // 상태

if (isBlue && isPresent) {
  console.log('Blue is present!')
}
```

### `has`

현재 맥락이 어떤 값이나 상태를 갖고 있는지를 설명한다(보통 `boolean`).

```js
/* 나쁜 예 */
const isProductsExist = productsCount > 0
const areProductsPresent = productsCount > 0

/* 좋은 예 */
const hasProducts = productsCount > 0
```

### `should`

특정 동작과 결합된 긍정형 조건문을 나타낸다(보통 `boolean`).

```js
function shouldUpdateUrl(url, expectedUrl) {
  return url !== expectedUrl
}
```

### `min`/`max`

최솟값 또는 최댓값을 나타낸다. 경계나 한계를 설명할 때 쓴다.

```js
/**
 * 주어진 min/max 경계 안에서
 * 임의 개수의 게시물을 렌더링한다.
 */
function renderPosts(posts, minPosts, maxPosts) {
  return posts.slice(0, randomBetween(minPosts, maxPosts))
}
```

### `prev`/`next`

현재 맥락에서 변수의 이전 상태 또는 다음 상태를 가리킨다. 상태 전이를 설명할 때 쓴다.

```jsx
async function getPosts() {
  const prevPosts = this.state.posts

  const latestPosts = await fetch('...')
  const nextPosts = concat(prevPosts, latestPosts)

  this.setState({ posts: nextPosts })
}
```

## 단수와 복수

접두사와 비슷하게, 변수 이름은 값 하나를 담는지 여러 값을 담는지에 따라 단수형 또는 복수형으로 만들 수 있다.

```js
/* 나쁜 예 */
const friends = 'Bob'
const friend = ['Bob', 'Tony', 'Tanya']

/* 좋은 예 */
const friend = 'Bob'
const friends = ['Bob', 'Tony', 'Tanya']
```
