import { View } from 'ckeditor5';
import { MAX_COLUMNS, DEFAULT_GUTTER, MAX_GUTTER } from '../gridlayout/constants';

export default class GridLayoutFormView extends View {
    constructor(locale, i18n) {
        super(locale);

        this._t = key => i18n.t(key);
        this._columnCount = 2;
        this._configs = [];
        this._submitBtn = null;
        this._validationEl = null;
        this._tableEl = null;

        this.setTemplate({
            tag: 'div',
            attributes: {
                class: ['ck', 'ck-grid-layout-overlay'],
            },
        });
    }

    render() {
        super.render();
        this.element.style.display = 'none';
    }

    show(options = {}) {
        this._columnCount = options.columnCount || 2;
        this._gutter = options.gutter != null ? options.gutter : DEFAULT_GUTTER;
        this._configs = options.configs
            ? options.configs.map(c => ({ ...c }))
            : this._defaultConfigs();
        this._isEdit = !!options.isEdit;
        this._buildForm();
        this.element.style.display = 'flex';
    }

    hide() {
        this.element.style.display = 'none';
        this.element.innerHTML = '';
    }

    _defaultConfigs() {
        return Array.from({ length: this._columnCount }, () => ({
            colDefault: 12, colMd: '', colLg: '', colXl: '',
        }));
    }

    _buildForm() {
        const t = this._t;
        this.element.innerHTML = '';

        // Backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'ck-grid-layout-backdrop';
        backdrop.addEventListener('click', () => {
            this.hide();
            this.fire('cancel');
        });
        this.element.appendChild(backdrop);

        // Form container
        const form = document.createElement('div');
        form.className = 'ck-grid-layout-form';

        // Title
        const title = document.createElement('div');
        title.className = 'ck-grid-form-title';
        title.textContent = t('Grid Layout');
        form.appendChild(title);

        // Column count selector
        const countRow = document.createElement('div');
        countRow.className = 'ck-grid-form-section';

        const countLabel = document.createElement('span');
        countLabel.className = 'ck-grid-form-label';
        countLabel.textContent = t('Columns');
        countRow.appendChild(countLabel);

        const countBtns = document.createElement('div');
        countBtns.className = 'ck-grid-form-count-buttons';
        for (let i = 1; i <= MAX_COLUMNS; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = String(i);
            btn.className = 'ck-grid-form-count-btn';
            if (i === this._columnCount) btn.classList.add('active');
            btn.addEventListener('click', () => this._setColumnCount(i));
            countBtns.appendChild(btn);
        }
        countRow.appendChild(countBtns);
        form.appendChild(countRow);

        // Gap selector
        const gapRow = document.createElement('div');
        gapRow.className = 'ck-grid-form-section';

        const gapLabel = document.createElement('span');
        gapLabel.className = 'ck-grid-form-label';
        gapLabel.textContent = t('Gap');
        gapRow.appendChild(gapLabel);

        const gapBtns = document.createElement('div');
        gapBtns.className = 'ck-grid-form-count-buttons';
        for (let i = 0; i <= MAX_GUTTER; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = String(i);
            btn.className = 'ck-grid-form-count-btn';
            if (i === this._gutter) btn.classList.add('active');
            btn.addEventListener('click', () => {
                this._gutter = i;
                gapBtns.querySelectorAll('.ck-grid-form-count-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            gapBtns.appendChild(btn);
        }
        gapRow.appendChild(gapBtns);
        form.appendChild(gapRow);

        // Help text
        const help = document.createElement('div');
        help.className = 'ck-grid-form-help';
        help.textContent = t('Grid help text');
        form.appendChild(help);

        // Config table
        this._tableEl = document.createElement('div');
        this._tableEl.className = 'ck-grid-form-table';
        this._buildConfigTable();
        form.appendChild(this._tableEl);

        // Validation
        this._validationEl = document.createElement('div');
        this._validationEl.className = 'ck-grid-form-validation';
        form.appendChild(this._validationEl);

        // Action buttons
        const actions = document.createElement('div');
        actions.className = 'ck-grid-form-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = t('Cancel');
        cancelBtn.className = 'ck-grid-form-btn ck-grid-form-btn-cancel';
        cancelBtn.addEventListener('click', () => {
            this.hide();
            this.fire('cancel');
        });

        this._submitBtn = document.createElement('button');
        this._submitBtn.type = 'button';
        this._submitBtn.textContent = this._isEdit ? 'OK' : t('Insert');
        this._submitBtn.className = 'ck-grid-form-btn ck-grid-form-btn-submit';
        this._submitBtn.addEventListener('click', () => this._submit());

        actions.appendChild(cancelBtn);
        actions.appendChild(this._submitBtn);
        form.appendChild(actions);

        this.element.appendChild(form);
        this._validate();
    }

    _setColumnCount(count) {
        this._columnCount = count;

        while (this._configs.length < count) {
            this._configs.push({ colDefault: 12, colMd: '', colLg: '', colXl: '' });
        }
        if (count < this._configs.length) {
            this._configs = this._configs.slice(0, count);
        }

        this._buildForm();
    }

    _buildConfigTable() {
        const t = this._t;
        this._tableEl.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.className = 'ck-grid-form-table-row ck-grid-form-table-header';
        ['', 'Default', 'MD', 'LG', 'XL'].forEach(text => {
            const cell = document.createElement('div');
            cell.className = 'ck-grid-form-table-cell';
            cell.textContent = text;
            header.appendChild(cell);
        });
        this._tableEl.appendChild(header);

        // Column rows
        for (let i = 0; i < this._columnCount; i++) {
            const row = document.createElement('div');
            row.className = 'ck-grid-form-table-row';

            const label = document.createElement('div');
            label.className = 'ck-grid-form-table-cell ck-grid-form-col-label';
            label.textContent = `${t('Col')} ${i + 1}`;
            row.appendChild(label);

            ['colDefault', 'colMd', 'colLg', 'colXl'].forEach(key => {
                const cell = document.createElement('div');
                cell.className = 'ck-grid-form-table-cell';

                const input = document.createElement('input');
                input.type = 'number';
                input.min = '1';
                input.max = '12';
                input.className = 'ck-grid-form-input';
                input.value = this._configs[i][key] !== '' && this._configs[i][key] != null
                    ? this._configs[i][key]
                    : '';

                if (key === 'colDefault') {
                    input.placeholder = '12';
                }

                input.addEventListener('input', () => {
                    const val = input.value.trim();
                    this._configs[i][key] = val === '' ? '' : parseInt(val);
                    this._validate();
                });

                cell.appendChild(input);
                row.appendChild(cell);
            });

            this._tableEl.appendChild(row);
        }
    }

    _validate() {
        const t = this._t;
        const errors = [];

        // Default is always required
        for (let i = 0; i < this._columnCount; i++) {
            const val = this._configs[i].colDefault;
            if (val === '' || val == null || val < 1 || val > 12) {
                errors.push(`${t('Col')} ${i + 1}: ${t('Default is required (1-12)')}`);
            }
        }

        // Optional breakpoints: if any column has a value, all must, and sum must be 12
        [
            { key: 'colMd', label: 'MD' },
            { key: 'colLg', label: 'LG' },
            { key: 'colXl', label: 'XL' },
        ].forEach(({ key, label }) => {
            const values = this._configs.map(c => c[key]);
            const hasAny = values.some(v => v !== '' && v != null);

            if (hasAny) {
                const allFilled = values.every(
                    v => v !== '' && v != null && v >= 1 && v <= 12
                );

                if (!allFilled) {
                    errors.push(`${label}: ${t('all columns must have a value (1-12)')}`);
                } else {
                    const sum = values.reduce((a, b) => a + (parseInt(b) || 0), 0);
                    if (sum !== 12) {
                        errors.push(`${label}: ${t('sum must be 12 (currently %{sum})', { sum })}`);
                    }
                }
            }
        });

        this._validationEl.innerHTML = '';
        errors.forEach(err => {
            const p = document.createElement('div');
            p.className = 'ck-grid-form-error';
            p.textContent = err;
            this._validationEl.appendChild(p);
        });

        this._submitBtn.disabled = errors.length > 0;
        return errors.length === 0;
    }

    _submit() {
        if (!this._validate()) return;

        const cleanConfigs = this._configs.map(config => {
            const clean = { colDefault: parseInt(config.colDefault) || 12 };
            if (config.colMd !== '' && config.colMd != null) {
                clean.colMd = parseInt(config.colMd);
            }
            if (config.colLg !== '' && config.colLg != null) {
                clean.colLg = parseInt(config.colLg);
            }
            if (config.colXl !== '' && config.colXl != null) {
                clean.colXl = parseInt(config.colXl);
            }
            return clean;
        });

        this.hide();
        this.fire('submit', { configs: cleanConfigs, gutter: this._gutter });
    }
}
