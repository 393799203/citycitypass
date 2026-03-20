export const formatPhone = (phone: string) => {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  return phone;
};

export const formatAddress = (province?: string, city?: string, address?: string, district?: string) => {
  const parts = [];
  if (province) parts.push(province);
  if (city) parts.push(city);
  if (district) parts.push(district);
  if (address) parts.push(address);
  if (parts.length === 0) return '-';
  return parts.join(' ');
};