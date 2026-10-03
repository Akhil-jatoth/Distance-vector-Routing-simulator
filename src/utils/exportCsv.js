/**
 * Exports data to CSV and triggers a client-side file download.
 */
export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportExperimentToCsv(experimentData) {
  const headers = [
    'NodeCount',
    'Iteration',
    'Standard_Rounds',
    'Standard_Converged',
    'SplitHorizon_Rounds',
    'SplitHorizon_Converged',
  ];

  const rows = (experimentData || []).map(row => [
    row.nodeCount,
    row.iteration,
    row.standardRounds,
    row.standardConverged ? 'Yes' : 'No',
    row.shRounds,
    row.shConverged ? 'Yes' : 'No',
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCsv(`dv_experiments_${Date.now()}.csv`, csvContent);
}

export function exportMatrixToCsv(nodes, matrix) {
  const headers = ['Source', ...nodes];
  const rows = nodes.map(src => {
    const row = [src];
    nodes.forEach(dst => {
      const cost = matrix[src]?.[dst]?.cost ?? matrix[src]?.[dst] ?? 16;
      row.push(cost >= 16 ? 'INF' : cost);
    });
    return row.join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadCsv(`dv_cost_matrix_${Date.now()}.csv`, csvContent);
}
