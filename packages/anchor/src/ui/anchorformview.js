import { View } from 'ckeditor5';

/**
 * A small modal overlay with a single anchor-id input, live validation,
 * and Insert/Cancel actions. Emits `submit` ({ id }) and `cancel`.
 */
export default class AnchorFormView extends View {
    constructor(locale, i18n) {
        super(locale);

        this._t = key => i18n.t(key);
        this._isEdit = false;
        this._inputEl = null;
        this._errorEl = null;
        this._submitBtn = null;

        // Provided by the owner (AnchorUI) so validation can see the document.
        this.validator = null;

        this.setTemplate({
            tag: 'div',
            attributes: {
                class: ['ck', 'ck-anchor-form-overlay'],
            },
        });
    }

    render() {
        super.render();
        this.element.style.display = 'none';
    }

    show(options = {}) {
        this._isEdit = !!options.isEdit;
        this._initialId = options.id || '';
        this._buildForm();
        this.element.style.display = 'flex';

        if (this._inputEl) {
            this._inputEl.focus();
            this._inputEl.select();
        }
    }

    hide() {
        this.element.style.display = 'none';
        this.element.innerHTML = '';
        this._inputEl = null;
        this._errorEl = null;
        this._submitBtn = null;
    }

    _buildForm() {
        const t = this._t;
        this.element.innerHTML = '';

        const backdrop = document.createElement('div');
        backdrop.className = 'ck-anchor-form-backdrop';
        backdrop.addEventListener('click', () => {
            this.hide();
            this.fire('cancel');
        });
        this.element.appendChild(backdrop);

        const form = document.createElement('div');
        form.className = 'ck-anchor-form';

        const title = document.createElement('div');
        title.className = 'ck-anchor-form-title';
        title.textContent = t('Anchor');
        form.appendChild(title);

        const help = document.createElement('div');
        help.className = 'ck-anchor-form-help';
        help.textContent = t('Anchor help text');
        form.appendChild(help);

        const label = document.createElement('label');
        label.className = 'ck-anchor-form-label';
        label.textContent = t('Anchor name');
        form.appendChild(label);

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'ck-anchor-form-input';
        input.value = this._initialId;
        input.placeholder = 'section-1';
        input.addEventListener('input', () => this._validate());
        input.addEventListener('keydown', evt => {
            if (evt.key === 'Enter') {
                evt.preventDefault();
                this._submit();
            } else if (evt.key === 'Escape') {
                evt.preventDefault();
                this.hide();
                this.fire('cancel');
            }
        });
        label.appendChild(input);
        this._inputEl = input;

        const error = document.createElement('div');
        error.className = 'ck-anchor-form-error';
        form.appendChild(error);
        this._errorEl = error;

        const actions = document.createElement('div');
        actions.className = 'ck-anchor-form-actions';

        // In edit mode the form also offers Remove, pushed to the left so the
        // primary (Update) and Cancel actions stay grouped on the right.
        if (this._isEdit) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'ck-anchor-form-btn ck-anchor-form-btn-remove';
            removeBtn.textContent = t('Remove anchor');
            removeBtn.addEventListener('click', () => {
                this.hide();
                this.fire('remove');
            });
            actions.appendChild(removeBtn);
        }

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'ck-anchor-form-btn ck-anchor-form-btn-cancel';
        cancelBtn.textContent = t('Cancel');
        cancelBtn.addEventListener('click', () => {
            this.hide();
            this.fire('cancel');
        });

        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className = 'ck-anchor-form-btn ck-anchor-form-btn-submit';
        submitBtn.textContent = this._isEdit ? t('Update') : t('Insert');
        submitBtn.addEventListener('click', () => this._submit());
        this._submitBtn = submitBtn;

        actions.appendChild(cancelBtn);
        actions.appendChild(submitBtn);
        form.appendChild(actions);

        this.element.appendChild(form);

        this._validate();
    }

    _currentId() {
        return this._inputEl ? this._inputEl.value.trim() : '';
    }

    _validate() {
        if (!this.validator) {
            return true;
        }
        const result = this.validator(this._currentId());
        const message = result.valid ? '' : this._messageFor(result.reason);

        if (this._errorEl) {
            this._errorEl.textContent = message;
        }
        if (this._submitBtn) {
            this._submitBtn.disabled = !result.valid;
        }
        return result.valid;
    }

    _messageFor(reason) {
        const t = this._t;
        switch (reason) {
            case 'empty':
                return t('ID is required');
            case 'whitespace':
                return t('ID must not contain spaces');
            case 'syntax':
                return t('Invalid ID format');
            case 'duplicate':
                return t('This ID is already used in the document');
            default:
                return '';
        }
    }

    _submit() {
        if (!this._validate()) {
            return;
        }
        const id = this._currentId();
        this.hide();
        this.fire('submit', { id });
    }
}
