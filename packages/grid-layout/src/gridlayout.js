import { Plugin } from 'ckeditor5';
import GridLayoutEditing from './gridlayout/gridlayoutediting';
import GridLayoutUI from './gridlayout/gridlayoutui';

export default class GridLayout extends Plugin {
    static get requires() {
        return [GridLayoutEditing, GridLayoutUI];
    }

    static get pluginName() {
        return 'GridLayout';
    }
}
