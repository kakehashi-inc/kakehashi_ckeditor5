export function removeWhitespaceFromColor(colorItem) {
    if (!colorItem || !colorItem.color) {
        return colorItem;
    }
    colorItem.color = colorItem.color.replace(/\s/g, '');
    return colorItem;
}
