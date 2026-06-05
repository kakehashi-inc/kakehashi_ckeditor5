import { Plugin } from 'ckeditor5';
import AnchorEditing from './anchor/anchorediting';
import AnchorUI from './anchor/anchorui';

export default class Anchor extends Plugin {
    static get requires() {
        return [AnchorEditing, AnchorUI];
    }

    static get pluginName() {
        return 'Anchor';
    }
}
