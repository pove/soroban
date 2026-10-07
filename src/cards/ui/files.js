/** Browser file helpers: download a text file and read a user-selected one. */

export function downloadText(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Opens the file picker of `input` and resolves with the chosen file's text, or null when the
 * dialog is dismissed. The input is reset so the same file can be picked again.
 */
export function pickTextFile(input) {
  return new Promise((resolve) => {
    input.onchange = async () => {
      const file = input.files?.[0];
      input.value = '';
      resolve(file ? await file.text() : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
