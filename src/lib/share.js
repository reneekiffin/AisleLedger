/**
 * Hands a generated file to the OS: the share sheet on phones, a download
 * everywhere else. Used for CSV and JSON exports.
 *
 * @returns {'share'|'download'|'cancelled'}
 */
export async function shareTextFile(text, filename, type = 'text/plain') {
  const file = new File([text], filename, { type })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'share'
    } catch (err) {
      // Dismissing the sheet isn't a failure, but it isn't an export either.
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }

  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'download'
}
