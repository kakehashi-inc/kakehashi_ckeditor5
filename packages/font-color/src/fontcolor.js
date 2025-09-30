import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import FontColorEditing from './fontcolor/fontcolorediting';
import FontColorUI from './fontcolor/fontcolorui';

export default class FontColor extends Plugin {
    static get requires() {
        return [FontColorEditing, FontColorUI];
    }

    static get pluginName() {
        return 'FontColor';
    }
}
