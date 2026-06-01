/**
 * Safely converts any date-like field from Firestore (Timestamp, Date, String, Number, or raw object)
 * into a formatted date string.
 */
export const formatFirestoreDate = (dateField: any): string => {
  if (!dateField) return 'N/A';
  
  // 1. If it's a Firestore Timestamp with toDate method
  if (typeof dateField.toDate === 'function') {
    try {
      return dateField.toDate().toLocaleDateString();
    } catch (e) {
      console.error('Error calling toDate() on timestamp:', e);
    }
  }
  
  // 2. If it's already a JS Date object
  if (dateField instanceof Date) {
    return dateField.toLocaleDateString();
  }
  
  // 3. If it is a string or number
  if (typeof dateField === 'string' || typeof dateField === 'number') {
    try {
      const parsed = new Date(dateField);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString();
      }
    } catch (e) {}
  }
  
  // 4. If it's a plain object with seconds (like a serialized Timestamp)
  if (dateField && typeof dateField === 'object' && dateField.seconds !== undefined) {
    try {
      const parsed = new Date(dateField.seconds * 1000);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString();
      }
    } catch (e) {}
  }
  
  return 'N/A';
};

/**
 * Safely extracts a numeric timestamp (getTime) from any date-like field from Firestore.
 */
export const getFirestoreDateTime = (dateField: any): number => {
  if (!dateField) return 0;
  
  if (typeof dateField.toDate === 'function') {
    try {
      return dateField.toDate().getTime();
    } catch (e) {}
  }
  
  if (dateField instanceof Date) {
    return dateField.getTime();
  }
  
  if (typeof dateField === 'string' || typeof dateField === 'number') {
    try {
      const parsed = new Date(dateField);
      if (!isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    } catch (e) {}
  }
  
  if (dateField && typeof dateField === 'object' && dateField.seconds !== undefined) {
    try {
      return dateField.seconds * 1000;
    } catch (e) {}
  }
  
  return 0;
};

/**
 * Safely extracts a YYYY-MM-DD ISO date string from any date-like field from Firestore,
 * suitable for populating date inputs in edit modals.
 */
export const getFirestoreISOString = (dateField: any): string => {
  if (!dateField) return '';
  
  if (typeof dateField.toDate === 'function') {
    try {
      return dateField.toDate().toISOString().split('T')[0];
    } catch (e) {}
  }
  
  if (dateField instanceof Date) {
    try {
      return dateField.toISOString().split('T')[0];
    } catch (e) {}
  }
  
  if (typeof dateField === 'string') {
    return dateField.split('T')[0];
  }
  
  if (dateField && typeof dateField === 'object' && dateField.seconds !== undefined) {
    try {
      return new Date(dateField.seconds * 1000).toISOString().split('T')[0];
    } catch (e) {}
  }
  
  return '';
};

