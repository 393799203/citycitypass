interface LicensePlateBadgeProps {
  plate: string | undefined | null;
  className?: string;
}

export default function LicensePlateBadge({ plate, className = '' }: LicensePlateBadgeProps) {
  if (!plate) {
    return <span className={className}>-</span>;
  }

  const isNewEnergy = plate.length === 8;
  
  const formatPlate = () => {
    if (isNewEnergy) {
      return `${plate.slice(0, 2)}·${plate.slice(2, 5)} ${plate.slice(5)}`;
    }
    return `${plate.slice(0, 2)}·${plate.slice(2)}`;
  };

  return (
    <span className={`inline-flex items-center justify-center px-2 py-1 text-white text-sm font-medium rounded ${isNewEnergy ? 'bg-green-600' : 'bg-blue-600'} ${className}`}>
      {formatPlate()}
    </span>
  );
}
