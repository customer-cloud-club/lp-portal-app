/**
 * Formats file size from bytes to human-readable format
 *
 * @param bytes - The file size in bytes
 * @returns Formatted string with appropriate unit (B, KB, MB, GB, TB)
 *
 * @example
 * ```typescript
 * formatFileSize(1024); // "1 KB"
 * formatFileSize(1536); // "1.5 KB"
 * formatFileSize(1048576); // "1 MB"
 * ```
 */
export function formatFileSize(bytes: number): string {
  // Validate input
  if (!Number.isFinite(bytes)) {
    throw new Error('Input must be a finite number');
  }

  if (bytes < 0) {
    throw new Error('Input must be a non-negative number');
  }

  // Define units and their thresholds
  const units: readonly string[] = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  const threshold = 1024;

  // Handle zero bytes
  if (bytes === 0) {
    return '0 B';
  }

  // Handle values less than 1 byte
  if (bytes < 1) {
    const rounded = Math.round(bytes * 10) / 10;
    return rounded === 0 ? '0 B' : `${rounded} B`;
  }

  // Calculate the appropriate unit
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(threshold));
  const clampedIndex = Math.min(Math.max(unitIndex, 0), units.length - 1);

  // Calculate the size in the appropriate unit
  const size = bytes / Math.pow(threshold, clampedIndex);

  // Format the number (remove unnecessary decimal places)
  const rounded = Math.round(size * 10) / 10;
  const formattedSize = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);

  return `${formattedSize} ${units[clampedIndex]}`;
}
