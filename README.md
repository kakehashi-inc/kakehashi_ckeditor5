# CKEditor 5の専用カスタマイズ

CKEditor 5に個別の追加機能や、機能の置き換えを行うためのプロジェクトです。

## 追加プラグイン

### Container Block（コンテナブロック）

リサイズ可能なコンテナブロックを提供するプラグインです。

**主な機能：**
- ドラッグによる自由なリサイズ（10%〜100%、1%単位）
- プリセットサイズの選択（100%, 75%, 50%, 25%）
- 位置調整（左寄せ、中央配置、右寄せ）
- すべてのCKEditorブロックをコンテナ内に配置可能
- 外部CSS不要のクリーンなHTML出力

詳細は [packages/container-block/README.md](packages/container-block/README.md) を参照してください。

### Grid Layout（グリッドレイアウト）

Bootstrap 5のグリッドシステムを利用したレスポンシブレイアウトを提供するプラグインです。HTML出力はBootstrap 5の `row` / `col-*` クラスをそのまま使用するため、表示側にBootstrap 5 CSSが読み込まれていれば追加CSSは不要です。

**前提条件：** エディタ利用側およびコンテンツ表示側でBootstrap 5 CSSが読み込まれていること。

**主な機能：**
- ダイアログから列数（1〜6列）と各列のレスポンシブ幅を設定
- Bootstrap 5の12カラムグリッド（合計12で比率指定）
- レスポンシブブレークポイント対応（Default / MD>=768px / LG>=992px / XL>=1200px）
- バルーンツールバーによるグリッドの編集・削除
- 多言語対応（エディタの `language` 設定に連動）

**出力HTML例：**

```html
<div class="row">
  <div class="col-12 col-lg-5">...</div>
  <div class="col-12 col-lg-3">...</div>
  <div class="col-12 col-lg-4">...</div>
</div>
```

### Anchor（アンカー）

ページ内リンクの飛び先（フラグメント `#id`）をGUIで設定するプラグインです。CKEditor 5標準にはアンカー専用機能がないため、独自に追加しています。

**主な機能：**

- ツールバーの錨ボタンから、選択対象に応じてアンカーIDを付与
  - テキスト範囲を選択 → そのテキストを `<span id="...">` で囲む
  - 見出し・段落を全選択 → その要素自体に `id` を付与（`<h2 id="...">` など）
  - 画像・表・複数ブロックなどを選択 → `<div id="...">` で囲む（中身は変更しない）
- アンカーの「付与・名前編集・削除」はすべてツールバーの錨ボタンから開くフォームに集約。既存アンカー上で押すと現在のIDが入った編集フォーム（更新・削除）が開く。画像や表などのバルーンと競合しない
- 編集中はアンカー開始位置に錨アイコンを表示（下線・背景などの装飾は使わず、実際の書式と誤認させない）
- IDバリデーション（必須・一意・空白不可・有効なCSS識別子）
- アクセシビリティ対応：ネイティブにフォーカスできない要素には `tabindex="-1"` を自動付与（`#id` リンクでフォーカスが当たるように）。`a` などフォーカス可能な要素には付与しない
- General HTML Support と競合せず、ソース編集で手書きした `id` も保持
- 多言語対応（エディタの `language` 設定に連動）

**出力HTML例：**

```html
<!-- テキスト範囲を選択した場合 -->
<p>詳しくは<span id="detail" tabindex="-1">こちら</span>を参照</p>

<!-- 見出しを選択した場合 -->
<h2 id="section-1" tabindex="-1">第1章</h2>
```

リンク付けは標準のリンク機能でURL欄に `#section-1` のように入力します。

## ビルド

```bash
yarn build
# npm build
```

./buildに出力される

## パッケージング

```bash
npm pack
# yarn pack
```

## 多言語対応

日本での利用を想定し、以下の言語をバンドルしています。

| コード | 言語 |
| -------- | ------ |
| `ja` | 日本語（デフォルト） |
| `en` | 英語 |
| `zh-cn` | 中国語（簡体字） |
| `ko` | 韓国語 |
| `pt-br` | ポルトガル語（ブラジル） |
| `vi` | ベトナム語 |
| `th` | タイ語 |
| `id` | インドネシア語 |
| `ne` | ネパール語 |

### 言語の指定

デフォルトは日本語です。エディタ生成時に `language` オプションで切り替えられます。

```js
// 日本語（デフォルト - 指定不要）
Editor.create(element);

// 英語を指定
Editor.create(element, { language: 'en' });

// 中国語を指定
Editor.create(element, { language: 'zh-cn' });
```

### ブラウザの言語設定による自動切り替え

ブラウザの言語設定に応じて自動的にUIの言語を切り替えるには、以下のように初期化します。

```js
// バンドル済みの言語一覧
const supportedLanguages = ['ja', 'en', 'zh-cn', 'ko', 'pt-br', 'vi', 'th', 'id', 'ne'];

// ブラウザの言語設定からマッチする言語を取得（見つからなければ 'ja'）
const browserLang = navigator.language.toLowerCase();
const language = supportedLanguages.find(lang =>
    browserLang === lang || browserLang.startsWith(lang.split('-')[0])
) || 'ja';

Editor.create(element, { language });
```

## 利用方法

パッケージングしたtgzをローカルノードとして他のプロジェクトで利用。

## ライセンス

このプロジェクトはCKEditor 5のライセンスに準拠しています。

CKEditor 5はデュアルライセンス（GPL 2.0以降またはMPL 2.0）で提供されており、このプロジェクトもそのライセンス条項に従います。商用利用の場合は、CKSourceからの商用ライセンスの取得が必要となる場合があります。

詳細については、以下をご参照ください：
- [CKEditor 5 License](https://ckeditor.com/legal/ckeditor-oss-license/)
- [CKEditor 5 GitHub Repository](https://github.com/ckeditor/ckeditor5)
