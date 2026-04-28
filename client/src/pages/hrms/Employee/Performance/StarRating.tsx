/** @format */

import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}

export default function StarRating({
  value,
  onChange,
  readOnly = false,
}: StarRatingProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          onClick={() => {
            if (!readOnly && onChange) {
              onChange(i);
            }
          }}
          className={`
            transition
            ${readOnly ? "cursor-default" : "cursor-pointer"}
            ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
          `}
        />
      ))}
    </div>
  );
}
