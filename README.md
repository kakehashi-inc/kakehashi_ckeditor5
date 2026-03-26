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
