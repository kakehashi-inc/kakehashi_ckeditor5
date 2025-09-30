import { FONT_COLOR } from './constants';
import fontColorIcon from '../../theme/icons/font-color.svg';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ColorTableView from '../ui/colortableview';
import { removeWhitespaceFromColor } from '../utils';
import { createDropdown } from '@ckeditor/ckeditor5-ui/src/dropdown/utils';

import i18next from 'i18next';

import languageBundle from '@lang/index?targets=font-color';
i18next.init({
    fallbackLng: 'ja',
    resources: languageBundle,
    ns: ['font-color'],
    defaultNS: 'font-color',
});

export default class FontColorUI extends Plugin {
    constructor(editor) {
        super(editor);
        this.commandName = FONT_COLOR;
        this.componentName = FONT_COLOR;
    }

    static get pluginName() {
        return 'FontColorUI';
    }

    init() {
        const editor = this.editor;
        const t = editor.t;
        const fontColorCommand = editor.commands.get(this.commandName);
        const columns = editor.config.get(this.componentName).columns;
        const themeColors = editor.config.get(this.componentName).themeColors.map(removeWhitespaceFromColor);
        const exactColors = editor.config
            .get(this.componentName)
            .exactColors.map(removeWhitespaceFromColor)
            .filter(ec => !themeColors.find(tc => tc.color === ec.color)); //Remove theme colors from exactColors array

        // Register the UI component.
        editor.ui.componentFactory.add(this.componentName, locale => {
            const dropdownView = createDropdown(locale);

            this.colorTableView = new ColorTableView(locale, {
                exactColors,
                themeColors,
                columns,
                closeButtonLabel: i18next.t('Select color'),
                removeButtonLabel: i18next.t('Remove color'),
                themeColorsLabel: i18next.t('Theme colors'),
            });

            dropdownView.panelView.children.add(this.colorTableView);

            this.colorTableView.delegate('execute').to(dropdownView);
            this.colorTableView.bind('selectedColor').to(fontColorCommand, 'value');

            dropdownView.buttonView.set({
                label: i18next.t('Font Color'),
                icon: fontColorIcon,
                tooltip: true,
            });

            dropdownView.extendTemplate({
                attributes: {
                    class: 'ck-color-ui-dropdown',
                },
            });

            dropdownView.bind('isEnabled').to(fontColorCommand);

            dropdownView.on('execute', (evt, data) => {
                const color = data.value;
                const themeColor = themeColors.find(item => item.color === color);
                const paletteKey = themeColor ? themeColor.paletteKey : null;
                editor.execute(this.commandName, { paletteKey, color });
                editor.editing.view.focus();
            });

            dropdownView.on('change:isOpen', (evt, name, isVisible) => {
                if (isVisible) {
                    this.colorTableView.updateSelectedColors();
                }
            });

            return dropdownView;
        });
    }
}
