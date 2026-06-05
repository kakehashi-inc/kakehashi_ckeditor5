import { Command } from 'ckeditor5';
import { GRID_ROW, GRID_COL, DEFAULT_GUTTER } from './constants';

export default class GridLayoutCommand extends Command {
    refresh() {
        const selection = this.editor.model.document.selection;
        const gridRow = this._findGridRow(selection);

        this.isEnabled = true;
        this.value = gridRow ? this._getGridInfo(gridRow) : null;
    }

    execute(options = {}) {
        if (options.addContentRow) {
            this._addContentRow();
        } else if (options.deleteContentRow) {
            this._deleteContentRow();
        } else if (options.update) {
            this._updateGrid(options.update, options.gutter);
        } else if (options.columns) {
            this._insertGrid(options.columns, options.gutter);
        }
    }

    _insertGrid(columns, gutter) {
        const model = this.editor.model;
        const selection = model.document.selection;

        model.change(writer => {
            const firstPosition = selection.getFirstPosition();
            let block = firstPosition.parent;
            if (block.is('$text') || !block.is('element')) {
                block = block.parent;
            }
            if (!block || !block.parent) return;

            const existingRow = this._findGridRow(selection);
            const target = existingRow || block;
            const parent = target.parent;
            const index = parent.getChildIndex(target);

            const gridRow = writer.createElement(GRID_ROW, {
                gutter: gutter != null ? gutter : DEFAULT_GUTTER,
            });
            columns.forEach(config => {
                const attrs = this._buildAttrs(config);
                const gridCol = writer.createElement(GRID_COL, attrs);
                const paragraph = writer.createElement('paragraph');
                writer.append(paragraph, gridCol);
                writer.append(gridCol, gridRow);
            });

            writer.insert(gridRow, parent, index + 1);

            const firstCol = gridRow.getChild(0);
            if (firstCol && firstCol.getChild(0)) {
                writer.setSelection(firstCol.getChild(0), 0);
            }
        });
    }

    /**
     * Add a new visual row: duplicate the column template and append cols to the same gridRow.
     * e.g. 3-col layout (col-lg-4 x3) -> adds 3 more col-lg-4 divs that wrap to the next line.
     */
    _addContentRow() {
        const selection = this.editor.model.document.selection;
        const gridRow = this._findGridRow(selection);
        if (!gridRow) return;

        const templateSize = this._getTemplateSize(gridRow);
        const cols = Array.from(gridRow.getChildren());

        // Build template from the first N cols
        const template = [];
        for (let i = 0; i < templateSize && i < cols.length; i++) {
            template.push({
                colDefault: cols[i].getAttribute('colDefault') || 12,
                colMd: cols[i].getAttribute('colMd'),
                colLg: cols[i].getAttribute('colLg'),
                colXl: cols[i].getAttribute('colXl'),
            });
        }

        this.editor.model.change(writer => {
            let firstNewCol = null;
            template.forEach(config => {
                const attrs = this._buildAttrs(config);
                const gridCol = writer.createElement(GRID_COL, attrs);
                const paragraph = writer.createElement('paragraph');
                writer.append(paragraph, gridCol);
                writer.append(gridCol, gridRow);
                if (!firstNewCol) firstNewCol = gridCol;
            });

            if (firstNewCol && firstNewCol.getChild(0)) {
                writer.setSelection(firstNewCol.getChild(0), 0);
            }
        });
    }

    /**
     * Delete the visual row (set of N cols) that contains the cursor.
     * Won't delete if it's the last remaining set.
     */
    _deleteContentRow() {
        const selection = this.editor.model.document.selection;
        const gridRow = this._findGridRow(selection);
        const currentCol = this._findGridCol(selection);
        if (!gridRow || !currentCol) return;

        const templateSize = this._getTemplateSize(gridRow);
        const cols = Array.from(gridRow.getChildren());

        // Don't delete the last visual row
        if (cols.length <= templateSize) return;

        const colIndex = cols.indexOf(currentCol);
        if (colIndex < 0) return;

        const rowStart = Math.floor(colIndex / templateSize) * templateSize;

        this.editor.model.change(writer => {
            // Remove cols from end to start to keep indices stable
            for (let i = Math.min(rowStart + templateSize, cols.length) - 1; i >= rowStart; i--) {
                writer.remove(cols[i]);
            }

            // Move cursor to a remaining col
            const remaining = Array.from(gridRow.getChildren());
            if (remaining.length > 0) {
                const target = remaining[Math.min(rowStart, remaining.length - 1)];
                const firstChild = target.getChild(0);
                if (firstChild) {
                    writer.setSelection(firstChild, 0);
                }
            }
        });
    }

    _updateGrid(columns, gutter) {
        const selection = this.editor.model.document.selection;
        const gridRow = this._findGridRow(selection);
        if (!gridRow) return;

        this.editor.model.change(writer => {
            if (gutter != null) {
                writer.setAttribute('gutter', gutter, gridRow);
            }
            const existingCols = Array.from(gridRow.getChildren());
            const newCount = columns.length;
            const existingCount = existingCols.length;

            for (let i = 0; i < Math.min(existingCount, newCount); i++) {
                writer.setAttribute('colDefault', columns[i].colDefault || 12, existingCols[i]);

                ['colMd', 'colLg', 'colXl'].forEach(attr => {
                    if (columns[i][attr]) {
                        writer.setAttribute(attr, columns[i][attr], existingCols[i]);
                    } else if (existingCols[i].hasAttribute(attr)) {
                        writer.removeAttribute(attr, existingCols[i]);
                    }
                });
            }

            for (let i = existingCount; i < newCount; i++) {
                const attrs = this._buildAttrs(columns[i]);
                const gridCol = writer.createElement(GRID_COL, attrs);
                const paragraph = writer.createElement('paragraph');
                writer.append(paragraph, gridCol);
                writer.append(gridCol, gridRow);
            }

            if (newCount < existingCount) {
                const lastKeepCol = existingCols[newCount - 1];
                for (let i = existingCount - 1; i >= newCount; i--) {
                    const colToRemove = existingCols[i];
                    const children = Array.from(colToRemove.getChildren());
                    children.forEach(child => {
                        writer.move(writer.createRangeOn(child), writer.createPositionAt(lastKeepCol, 'end'));
                    });
                    writer.remove(colToRemove);
                }
            }
        });
    }

    _buildAttrs(config) {
        const attrs = { colDefault: config.colDefault || 12 };
        if (config.colMd) attrs.colMd = config.colMd;
        if (config.colLg) attrs.colLg = config.colLg;
        if (config.colXl) attrs.colXl = config.colXl;
        return attrs;
    }

    /**
     * Determine how many cols form one visual row by finding the smallest N
     * where the breakpoint widths sum to 12.
     */
    _getTemplateSize(gridRow) {
        const cols = Array.from(gridRow.getChildren());
        if (cols.length === 0) return 1;

        // Use the most specific breakpoint that exists
        for (const attr of ['colXl', 'colLg', 'colMd']) {
            if (cols[0].hasAttribute(attr)) {
                let sum = 0;
                for (let i = 0; i < cols.length; i++) {
                    sum += cols[i].getAttribute(attr) || 0;
                    if (sum >= 12) return i + 1;
                }
                return cols.length;
            }
        }

        // Fallback to colDefault
        let sum = 0;
        for (let i = 0; i < cols.length; i++) {
            sum += cols[i].getAttribute('colDefault') || 12;
            if (sum >= 12) return i + 1;
        }
        return cols.length;
    }

    _findGridRow(selection) {
        const selectedElement = selection.getSelectedElement();
        if (selectedElement && selectedElement.name === GRID_ROW) {
            return selectedElement;
        }

        let element = selection.getFirstPosition().parent;
        while (element) {
            if (element.is('element') && element.name === GRID_ROW) {
                return element;
            }
            element = element.parent;
        }
        return null;
    }

    _findGridCol(selection) {
        let element = selection.getFirstPosition().parent;
        while (element) {
            if (element.is('element') && element.name === GRID_COL) {
                return element;
            }
            element = element.parent;
        }
        return null;
    }

    _getGridInfo(gridRow) {
        const cols = Array.from(gridRow.getChildren());
        const templateSize = this._getTemplateSize(gridRow);
        const configs = cols.map(col => ({
            colDefault: col.getAttribute('colDefault') || 12,
            colMd: col.getAttribute('colMd') || '',
            colLg: col.getAttribute('colLg') || '',
            colXl: col.getAttribute('colXl') || '',
        }));
        const gutter = gridRow.getAttribute('gutter');
        return { configs, templateSize, totalCols: cols.length, gutter: gutter != null ? gutter : DEFAULT_GUTTER };
    }
}
