/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import View from '@ckeditor/ckeditor5-ui/src/view';
import ColorGridView from '@ckeditor/ckeditor5-ui/src/colorgrid/colorgridview';
import LabelView from '@ckeditor/ckeditor5-ui/src/label/labelview';
import FocusTracker from '@ckeditor/ckeditor5-utils/src/focustracker';
import FocusCycler from '@ckeditor/ckeditor5-ui/src/focuscycler';
import KeystrokeHandler from '@ckeditor/ckeditor5-utils/src/keystrokehandler';
import removeButtonIcon from '@ckeditor/ckeditor5-core/theme/icons/eraser.svg';
import '../../theme/fontcolor.css';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import ColorInputView from './colorinputview';

export default class ColorTableView extends View {
    constructor(
        locale,
        {
            exactColors,
            themeColors,
            columns,
            closeButtonLabel,
            removeButtonLabel,
            themeColorsLabel,
            exactColorsLabel,
            customColorLabel,
        }
    ) {
        super(locale);

        this.items = this.createCollection();

        this.themeColors = themeColors;
        this.exactColors = exactColors;
        this.columns = columns;

        this.focusTracker = new FocusTracker();

        this.keystrokes = new KeystrokeHandler();

        this.set('selectedColor');

        this._focusCycler = new FocusCycler({
            focusables: this.items,
            focusTracker: this.focusTracker,
            keystrokeHandler: this.keystrokes,
            actions: {
                // Navigate list items backwards using the Arrow Up key.
                focusPrevious: 'arrowup',
                // Navigate list items forwards using the Arrow Down key.
                focusNext: 'arrowdown',
            },
        });

        this.setTemplate({
            tag: 'div',
            attributes: {
                class: ['ck', 'ck-color-table'],
            },
            children: this.items,
        });

        this.items.add(this._createRemoveColorButton(removeButtonLabel));

        if (themeColors.length > 0) {
            this.themeColorsGrid = this._createColorsGrid(this.themeColors);
            this.items.add(this._createLabel(themeColorsLabel));
            this.items.add(this.themeColorsGrid);
        }

        if (exactColors.length > 0) {
            this.exactColorsGrid = this._createColorsGrid(this.exactColors);
            this.items.add(this._createLabel(exactColorsLabel));
            this.items.add(this.exactColorsGrid);
        }

        this.colorInputView = this._createColorInputView(closeButtonLabel);
        this.items.add(this._createLabel(customColorLabel));
        this.items.add(this.colorInputView);
    }

    updateSelectedColors() {
        let selectedColor = this._getActualSelectedColor();
        if (this.themeColorsGrid) {
            this.themeColorsGrid.selectedColor = selectedColor;
        }
        if (this.exactColorsGrid) {
            this.exactColorsGrid.selectedColor = selectedColor;
        }
        this.colorInputView.set({ value: selectedColor });
    }

    render() {
        super.render();

        // Items added before rendering should be known to the #focusTracker.
        for (const item of this.items) {
            this.focusTracker.add(item.element);
        }
        // Start listening for the keystrokes coming from #element.
        this.keystrokes.listenTo(this.element);

        this.colorInputView.set({ parent: this.element });
    }

    focus() {
        this._focusCycler.focusFirst();
    }

    focusLast() {
        this._focusCycler.focusLast();
    }

    //If selectedColor is theme color, returns it's actual current value
    _getActualSelectedColor() {
        const themeColor = this.themeColors.find(item => item.paletteKey === this.selectedColor);
        return themeColor ? themeColor.color : this.selectedColor;
    }

    _createRemoveColorButton(removeButtonLabel) {
        const buttonView = new ButtonView();
        buttonView.set({
            withText: true,
            icon: removeButtonIcon,
            tooltip: true,
            label: removeButtonLabel,
        });

        buttonView.class = 'ck-color-table__remove-color';
        buttonView.on('execute', () => {
            this.fire('execute', { value: null });
        });
        return buttonView;
    }

    _createLabel(text) {
        const labelView = new LabelView(this.locale);
        labelView.text = text;
        labelView.extendTemplate({
            attributes: {
                class: ['ck', 'ck-color-grid__label'],
            },
        });
        return labelView;
    }

    _createColorsGrid(colors) {
        const colorGridView = new ColorGridView(this.locale, {
            colorDefinitions: colors.map(item => {
                item.label = item.color;
                item.options = { hasBorder: true };
                return item;
            }),
            columns: this.columns,
        });
        colorGridView.delegate('execute').to(this);
        return colorGridView;
    }

    _createColorInputView(closeButtonLabel) {
        const colorInputView = new ColorInputView(this.locale, closeButtonLabel);
        colorInputView.on('blur', () => {
            let value = colorInputView.getInputValue();
            this.fire('execute', { value });
        });
        return colorInputView;
    }
}
