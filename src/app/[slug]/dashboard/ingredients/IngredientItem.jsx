"use client";

import { UtensilsCrossed, Trash2 } from "lucide-react";
import { Card } from "@/components/ui";

function IngredientItem({ ingredient, onEdit, onDelete }) {
  return (
    <Card className="hover:border-border-hover transition">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {ingredient.image ? (
            <img
              src={ingredient.image}
              alt={ingredient.name}
              className="w-14 h-14 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-14 h-14 bg-surface-hover rounded-full flex items-center justify-center shrink-0">
              <UtensilsCrossed className="text-content" size={22} />
            </div>
          )}

          <div className="min-w-0">
            <h3
              className="font-semibold text-lg cursor-pointer hover:underline truncate"
              onClick={() => onEdit(ingredient)}
            >
              {ingredient.name}
            </h3>
            {ingredient.description && (
              <p className="text-content-muted text-sm truncate">{ingredient.description}</p>
            )}
            <p className="text-sm mt-1 font-medium text-success">
              {ingredient.quantity !== null
                ? `${ingredient.quantity} ${ingredient.typeUnity}`
                : "Insuficiente"}
            </p>
          </div>
        </div>

        <Trash2
          size={18}
          className="cursor-pointer text-content-muted hover:text-danger shrink-0"
          onClick={() => onDelete(ingredient.id)}
        />
      </div>
    </Card>
  );
}

export default IngredientItem;
