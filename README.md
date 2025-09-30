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

## 利用方法

パッケージングしたtgzをローカルノードとして他のプロジェクトで利用。

## ライセンス

このプロジェクトはCKEditor 5のライセンスに準拠しています。

CKEditor 5はデュアルライセンス（GPL 2.0以降またはMPL 2.0）で提供されており、このプロジェクトもそのライセンス条項に従います。商用利用の場合は、CKSourceからの商用ライセンスの取得が必要となる場合があります。

詳細については、以下をご参照ください：
- [CKEditor 5 License](https://ckeditor.com/legal/ckeditor-oss-license/)
- [CKEditor 5 GitHub Repository](https://github.com/ckeditor/ckeditor5)
