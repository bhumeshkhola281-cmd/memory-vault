export const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatRelative = (isoString) => {
  if (!isoString) return '';
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = (date.getTime() - now.getTime()) / 1000;
  
  if (Math.abs(diffInSeconds) < 60) return 'just now';
  
  const diffInMinutes = diffInSeconds / 60;
  if (Math.abs(diffInMinutes) < 60) return rtf.format(Math.round(diffInMinutes), 'minute');
  
  const diffInHours = diffInMinutes / 60;
  if (Math.abs(diffInHours) < 24) return rtf.format(Math.round(diffInHours), 'hour');
  
  const diffInDays = diffInHours / 24;
  if (Math.abs(diffInDays) < 30) return rtf.format(Math.round(diffInDays), 'day');
  
  const diffInMonths = diffInDays / 30;
  if (Math.abs(diffInMonths) < 12) return rtf.format(Math.round(diffInMonths), 'month');
  
  return rtf.format(Math.round(diffInMonths / 12), 'year');
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
