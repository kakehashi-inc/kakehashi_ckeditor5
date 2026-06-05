export const ANCHOR = 'anchor';
export const ANCHOR_ID = 'anchorId';
export const ANCHOR_BLOCK = 'anchorBlock';
export const ANCHOR_INLINE = 'anchorInline';

// MDN-compliant valid CSS identifier:
// first char a letter or underscore, the rest word chars or hyphen.
export const ID_PATTERN = /^[A-Za-z_][\w-]*$/;

// Standard blocks whose element itself can carry the id (method B).
// These names match the heading configuration in src/ckeditor.js.
export const STD_BLOCKS = ['paragraph', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6'];

// View tags that are natively focusable, so we must NOT add tabindex to them.
export const NATIVE_FOCUSABLE = ['a', 'button', 'input', 'select', 'textarea'];
