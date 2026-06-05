import { View, ButtonView } from 'ckeditor5';

export default class GridLayoutToolbarView extends View {
    constructor(locale, i18n) {
        super(locale);

        this._t = key => i18n.t(key);
        this.children = this.createCollection();

        this._createChildren();

        this.setTemplate({
            tag: 'div',
            attributes: {
                class: ['ck', 'ck-grid-layout-toolbar'],
                tabindex: '-1',
            },
            children: this.children,
        });
    }

    _createChildren() {
        // Info row (updated via setInfo with innerHTML for line breaks)
        const infoRow = new View(this.locale);
        infoRow.setTemplate({
            tag: 'div',
            attributes: { class: ['ck-grid-toolbar-row'] },
            children: [
                {
                    tag: 'span',
                    attributes: { class: ['ck-grid-info'] },
                },
            ],
        });
        this.children.add(infoRow);

        // Row operations
        const rowOpsRow = new View(this.locale);
        rowOpsRow.setTemplate({
            tag: 'div',
            attributes: { class: ['ck-grid-toolbar-row'] },
            children: [
                {
                    tag: 'div',
                    attributes: { class: ['ck-grid-controls'] },
                    children: this._createRowButtons(),
                },
            ],
        });
        this.children.add(rowOpsRow);

        // Paragraph insertion
        const insertRow = new View(this.locale);
        insertRow.setTemplate({
            tag: 'div',
            attributes: { class: ['ck-grid-toolbar-row', 'ck-grid-toolbar-row-last'] },
            children: [
                {
                    tag: 'div',
                    attributes: { class: ['ck-grid-controls'] },
                    children: this._createInsertButtons(),
                },
            ],
        });
        this.children.add(insertRow);
    }

    _createRowButtons() {
        const t = this._t;
        const buttons = [];

        const addRowBtn = new ButtonView(this.locale);
        addRowBtn.set({ label: t('Add row'), withText: true, class: 'ck-grid-btn' });
        addRowBtn.on('execute', () => this.fire('addRow'));
        buttons.push(addRowBtn);

        const deleteRowBtn = new ButtonView(this.locale);
        deleteRowBtn.set({ label: t('Delete selected row'), withText: true, class: 'ck-grid-btn ck-grid-btn-danger' });
        deleteRowBtn.on('execute', () => this.fire('deleteRow'));
        buttons.push(deleteRowBtn);

        return buttons;
    }

    _createInsertButtons() {
        const t = this._t;
        const buttons = [];

        const beforeBtn = new ButtonView(this.locale);
        beforeBtn.set({ label: t('Insert paragraph before'), withText: true, class: 'ck-grid-btn' });
        beforeBtn.on('execute', () => this.fire('insertBefore'));
        buttons.push(beforeBtn);

        const afterBtn = new ButtonView(this.locale);
        afterBtn.set({ label: t('Insert paragraph after'), withText: true, class: 'ck-grid-btn' });
        afterBtn.on('execute', () => this.fire('insertAfter'));
        buttons.push(afterBtn);

        return buttons;
    }

    setInfo(lines) {
        this._pendingInfo = lines;
        if (!this.element) return;
        const el = this.element.querySelector('.ck-grid-info');
        if (el) {
            el.innerHTML = lines.map(line => line.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('<br>');
        }
    }

    render() {
        super.render();
        if (this._pendingInfo) {
            this.setInfo(this._pendingInfo);
        }
    }

    destroy() {
        super.destroy();
    }
}
