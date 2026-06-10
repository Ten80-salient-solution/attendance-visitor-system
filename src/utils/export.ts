import { jsPDF } from 'jspdf';

/**
 * Exports data to a CSV file and triggers a browser download.
 */
export function exportToCSV(filename: string, headers: string[], rows: string[][]): void {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(val => {
        const cleaned = String(val || '').replace(/"/g, '""');
        return `"${cleaned}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports data to an Excel-compatible HTML/XML format that preserves columns and gridlines.
 */
export function exportToExcel(filename: string, sheetName: string, headers: string[], rows: string[][]): void {
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
  html += `<head>
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>${sheetName}</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      table { border-collapse: collapse; }
      th { background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 1px solid #d1d5db; padding: 8px; }
      td { border: 1px solid #d1d5db; padding: 6px 8px; }
    </style>
  </head>`;
  html += '<body><table><thead><tr>';
  headers.forEach(h => {
    html += `<th>${h}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  rows.forEach(row => {
    html += '<tr>';
    row.forEach(cell => {
      html += `<td>${cell !== null && cell !== undefined ? String(cell) : ''}</td>`;
    });
    html += '</tr>';
  });
  
  html += '</tbody></table></body></html>';

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports data to a landscape-oriented PDF document using jsPDF with auto-pagination.
 */
export function exportToPDF(filename: string, title: string, headers: string[], rows: string[][]): void {
  // landscape mode to accommodate wide tables
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  // PDF Header details
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229); // Primary Indigo color
  doc.text(title, 14, 20);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // Grey details
  doc.text(`Ten80 Salient Solutions - Secure Portal`, 14, 26);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 283 - 14, 26, { align: 'right' });
  
  // Decorative line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(14, 30, 283, 30);
  
  let y = 38;
  const pageHeight = 210; // A4 height in mm
  
  // Calculate column widths dynamically
  const colCount = headers.length;
  const availWidth = 269; // 283 - 14 (margins)
  const colWidth = availWidth / colCount;
  
  // Print Header Row
  doc.setFillColor(79, 70, 229);
  doc.rect(14, y - 5, 269, 7, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255); // White header text
  headers.forEach((h, i) => {
    doc.text(h, 16 + (i * colWidth), y);
  });
  
  y += 7;
  
  // Print Data Rows
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  
  rows.forEach((row, rowIndex) => {
    // Check for page overflow
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 25;
      
      // Reprint Header Row on new page
      doc.setFillColor(79, 70, 229);
      doc.rect(14, y - 5, 269, 7, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      headers.forEach((h, i) => {
        doc.text(h, 16 + (i * colWidth), y);
      });
      
      y += 7;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
    }
    
    // Alternate row backgrounds (light grey / white)
    if (rowIndex % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(14, y - 4, 269, 6, 'F');
    }
    
    doc.setTextColor(31, 41, 55); // Dark grey text
    row.forEach((cell, cellIndex) => {
      const val = String(cell !== null && cell !== undefined ? cell : '');
      
      // Clean display values that might overflow the cell width
      let displayVal = val;
      if (val.length > 30) {
        displayVal = val.substring(0, 27) + '...';
      }
      
      doc.text(displayVal, 16 + (cellIndex * colWidth), y);
    });
    
    y += 6;
  });
  
  // Save document
  doc.save(filename);
}
