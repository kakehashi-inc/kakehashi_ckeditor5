import { Plugin } from 'ckeditor5';
import ContainerBlockEditing from './containerblock/containerblockediting';
import ContainerBlockUI from './containerblock/containerblockui';
import ContainerBlockResizer from './containerblock/containerblockresizer';

export default class ContainerBlock extends Plugin {
    static get requires() {
        return [ContainerBlockEditing, ContainerBlockUI, ContainerBlockResizer];
    }

    static get pluginName() {
        return 'ContainerBlock';
    }
}
