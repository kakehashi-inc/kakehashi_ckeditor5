import { Plugin } from 'ckeditor5';
import GridLayoutCommand from './gridlayoutcommand';
import { GRID_ROW, GRID_COL, GRID_LAYOUT, RESPONSIVE_ATTRS, DEFAULT_GUTTER } from './constants';

const CLS_ROW = 'ck-grid-row';
const CLS_COL = 'ck-grid-col';
const CLS_GUTTER = 'ck-grid-g';

export default class GridLayoutEditing extends Plugin {
    static get pluginName() {
        return 'GridLayoutEditing';
    }

    init() {
        this._defineSchema();
        this._defineConverters();

        this.editor.commands.add(GRID_LAYOUT, new GridLayoutCommand(this.editor));

        this.editor.model.document.registerPostFixer(writer => {
            let changed = false;
            const root = this.editor.model.document.getRoot();
            const range = writer.createRangeIn(root);
            for (const value of range.getWalker()) {
                if (value.item.is('element', GRID_COL) && value.item.childCount === 0) {
                    writer.insertElement('paragraph', value.item, 0);
                    changed = true;
                }
            }
            return changed;
        });
    }

    _defineSchema() {
        const schema = this.editor.model.schema;

        schema.register(GRID_ROW, {
            isObject: false,
            isLimit: false,
            isBlock: true,
            allowWhere: '$block',
            allowAttributes: ['gutter'],
        });

        schema.register(GRID_COL, {
            isObject: false,
            isLimit: true,
            isBlock: true,
            allowIn: GRID_ROW,
            allowContentOf: '$root',
            allowAttributes: RESPONSIVE_ATTRS,
        });
    }

    _defineConverters() {
        const conversion = this.editor.conversion;

        // ===================== gridRow =====================

        conversion.for('upcast').elementToElement({
            view: { name: 'div', classes: CLS_ROW },
            model: (viewElement, { writer }) => {
                const classes = Array.from(viewElement.getClassNames());
                let gutter = DEFAULT_GUTTER;
                for (const cls of classes) {
                    const match = cls.match(new RegExp(`^${CLS_GUTTER}-(\\d+)$`));
                    if (match) {
                        gutter = parseInt(match[1]);
                        break;
                    }
                }
                return writer.createElement(GRID_ROW, { gutter });
            },
        });

        conversion.for('dataDowncast').elementToElement({
            model: GRID_ROW,
            view: (modelElement, { writer }) => {
                return writer.createContainerElement('div', {
                    class: buildRowClassString(modelElement),
                });
            },
        });

        conversion.for('editingDowncast').elementToElement({
            model: GRID_ROW,
            view: (modelElement, { writer }) => {
                return writer.createContainerElement('div', {
                    class: buildRowClassString(modelElement),
                });
            },
        });

        conversion.for('editingDowncast').add(dispatcher => {
            dispatcher.on('attribute:gutter:' + GRID_ROW, (evt, data, conversionApi) => {
                const viewWriter = conversionApi.writer;
                const viewElement = conversionApi.mapper.toViewElement(data.item);
                if (!viewElement) return;

                for (const cls of Array.from(viewElement.getClassNames())) {
                    if (new RegExp(`^${CLS_GUTTER}-\\d+$`).test(cls)) {
                        viewWriter.removeClass(cls, viewElement);
                    }
                }
                const newGutter = data.attributeNewValue;
                if (newGutter != null) {
                    viewWriter.addClass(`${CLS_GUTTER}-${newGutter}`, viewElement);
                }
            });
        });

        // ===================== gridCol =====================

        conversion.for('upcast').add(dispatcher => {
            dispatcher.on(
                'element:div',
                (evt, data, conversionApi) => {
                    const viewElement = data.viewItem;

                    if (!conversionApi.consumable.test(viewElement, { name: true })) {
                        return;
                    }

                    const classNames = Array.from(viewElement.getClassNames());
                    const hasColClass = classNames.some(cls => cls.startsWith(CLS_COL));
                    if (!hasColClass) return;

                    const attrs = parseColClasses(classNames);
                    const modelElement = conversionApi.writer.createElement(GRID_COL, attrs);

                    if (!conversionApi.safeInsert(modelElement, data.modelCursor)) {
                        return;
                    }

                    conversionApi.consumable.consume(viewElement, { name: true });
                    conversionApi.convertChildren(viewElement, modelElement);
                    conversionApi.updateConversionResult(modelElement, data);
                },
                { priority: 'normal' }
            );
        });

        conversion.for('dataDowncast').elementToElement({
            model: GRID_COL,
            view: (modelElement, { writer }) => {
                return writer.createContainerElement('div', {
                    class: buildColClassString(modelElement),
                });
            },
        });

        conversion.for('editingDowncast').elementToElement({
            model: GRID_COL,
            view: (modelElement, { writer }) => {
                return writer.createContainerElement('div', {
                    class: buildColClassString(modelElement),
                });
            },
        });

        RESPONSIVE_ATTRS.forEach(attr => {
            conversion.for('editingDowncast').add(dispatcher => {
                dispatcher.on(`attribute:${attr}:${GRID_COL}`, (evt, data, conversionApi) => {
                    rebuildColViewClasses(data.item, conversionApi);
                });
            });

            conversion.for('dataDowncast').add(dispatcher => {
                dispatcher.on(`attribute:${attr}:${GRID_COL}`, (evt, data, conversionApi) => {
                    rebuildColViewClasses(data.item, conversionApi);
                });
            });
        });
    }
}

// ===================== Helpers =====================

function buildRowClassString(modelElement) {
    const gutter = modelElement.getAttribute('gutter');
    return gutter != null ? `${CLS_ROW} ${CLS_GUTTER}-${gutter}` : CLS_ROW;
}

function parseColClasses(classNames) {
    const attrs = { colDefault: 12 };

    classNames.forEach(cls => {
        let match;
        if ((match = cls.match(new RegExp(`^${CLS_COL}-xl-(\\d+)$`)))) {
            attrs.colXl = parseInt(match[1]);
        } else if ((match = cls.match(new RegExp(`^${CLS_COL}-lg-(\\d+)$`)))) {
            attrs.colLg = parseInt(match[1]);
        } else if ((match = cls.match(new RegExp(`^${CLS_COL}-md-(\\d+)$`)))) {
            attrs.colMd = parseInt(match[1]);
        } else if ((match = cls.match(new RegExp(`^${CLS_COL}-(\\d+)$`)))) {
            attrs.colDefault = parseInt(match[1]);
        }
    });

    return attrs;
}

function buildColClassString(modelElement) {
    const classes = [];
    const colDefault = modelElement.getAttribute('colDefault') || 12;
    classes.push(`${CLS_COL}-${colDefault}`);

    const colMd = modelElement.getAttribute('colMd');
    if (colMd) classes.push(`${CLS_COL}-md-${colMd}`);

    const colLg = modelElement.getAttribute('colLg');
    if (colLg) classes.push(`${CLS_COL}-lg-${colLg}`);

    const colXl = modelElement.getAttribute('colXl');
    if (colXl) classes.push(`${CLS_COL}-xl-${colXl}`);

    return classes.join(' ');
}

function rebuildColViewClasses(modelElement, conversionApi) {
    const viewWriter = conversionApi.writer;
    const viewElement = conversionApi.mapper.toViewElement(modelElement);
    if (!viewElement) return;

    const existing = Array.from(viewElement.getClassNames());
    existing.forEach(cls => {
        if (cls.startsWith(CLS_COL)) {
            viewWriter.removeClass(cls, viewElement);
        }
    });

    const colDefault = modelElement.getAttribute('colDefault') || 12;
    viewWriter.addClass(`${CLS_COL}-${colDefault}`, viewElement);

    const colMd = modelElement.getAttribute('colMd');
    if (colMd) viewWriter.addClass(`${CLS_COL}-md-${colMd}`, viewElement);

    const colLg = modelElement.getAttribute('colLg');
    if (colLg) viewWriter.addClass(`${CLS_COL}-lg-${colLg}`, viewElement);

    const colXl = modelElement.getAttribute('colXl');
    if (colXl) viewWriter.addClass(`${CLS_COL}-xl-${colXl}`, viewElement);
}
