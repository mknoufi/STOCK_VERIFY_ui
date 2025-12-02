/**
 * CSV Export Utility
 * Helper functions for exporting data to CSV
 */

export const downloadCSV = (csvContent: string, filename: string) => {
  // For web
  if (typeof window !== 'undefined') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // For mobile, we'll need to use a file system library
    console.warn('CSV export not supported on mobile yet');
  }
};

export const convertToCSV = (data: any[], headers: string[]): string => {
  const csvRows: string[] = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header] ?? '';
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

export const exportItemsToCSV = (items: any[]): string => {
  const headers = [
    'item_code',
    'item_name',
    'barcode',
    'stock_qty',
    'mrp',
    'category',
    'subcategory',
    'uom_code',
    'uom_name',
    'floor',
    'rack',
    'warehouse',
    'verified',
    'verified_by',
    'verified_at',
    'last_scanned_at',
  ];

  const csvData = items.map((item) => ({
    item_code: item.item_code || '',
    item_name: item.item_name || '',
    barcode: item.barcode || '',
    stock_qty: item.stock_qty || 0,
    mrp: item.mrp || 0,
    category: item.category || '',
    subcategory: item.subcategory || '',
    uom_code: item.uom_code || '',
    uom_name: item.uom_name || '',
    floor: item.floor || '',
    rack: item.rack || '',
    warehouse: item.warehouse || '',
    verified: item.verified ? 'Yes' : 'No',
    verified_by: item.verified_by || '',
    verified_at: item.verified_at ? new Date(item.verified_at).toISOString() : '',
    last_scanned_at: item.last_scanned_at ? new Date(item.last_scanned_at).toISOString() : '',
  }));

  return convertToCSV(csvData, headers);
};

export const exportVariancesToCSV = (variances: any[]): string => {
  const headers = [
    'item_code',
    'item_name',
    'system_qty',
    'verified_qty',
    'variance',
    'verified_by',
    'verified_at',
    'category',
    'subcategory',
    'floor',
    'rack',
    'warehouse',
  ];

  const csvData = variances.map((variance) => ({
    item_code: variance.item_code || '',
    item_name: variance.item_name || '',
    system_qty: variance.system_qty || 0,
    verified_qty: variance.verified_qty || 0,
    variance: variance.variance || 0,
    verified_by: variance.verified_by || '',
    verified_at: variance.verified_at ? new Date(variance.verified_at).toISOString() : '',
    category: variance.category || '',
    subcategory: variance.subcategory || '',
    floor: variance.floor || '',
    rack: variance.rack || '',
    warehouse: variance.warehouse || '',
  }));

  return convertToCSV(csvData, headers);
};
