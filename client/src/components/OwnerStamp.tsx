interface OwnerStampProps {
  name: string;
  className?: string;
}

export default function OwnerStamp({ name, className = '' }: OwnerStampProps) {
  return (
    <div
      className={`absolute top-8 right-16 w-20 h-20 rounded-full border-2 border-orange-400 flex items-center justify-center text-center opacity-30 rotate-[-15deg] select-none pointer-events-none ${className}`}
      style={{ fontSize: '12px', lineHeight: '1.4', padding: '8px' }}
    >
      <span className="text-orange-600 font-medium">{name}</span>
    </div>
  );
}