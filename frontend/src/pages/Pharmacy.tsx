import { ArrowLeft, ShoppingCart, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useState } from "react";

const products = [
  { id: "1", name: "Panadol", description: "Pain relief tablets", price: 9.99, image: "💊" },
  { id: "2", name: "Cefixil Comral", description: "Antibiotic capsules", price: 25.99, image: "💊" },
  { id: "3", name: "Insulin", description: "Diabetes medication", price: 15.99, image: "💉" },
  { id: "4", name: "Cetrizine", description: "Allergy relief", price: 8.99, image: "💊" },
];

const Pharmacy = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<{ [key: string]: number }>({});

  const addToCart = (productId: string) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[productId] > 1) {
        newCart[productId]--;
      } else {
        delete newCart[productId];
      }
      return newCart;
    });
  };

  const cartItemCount = Object.values(cart).reduce((sum, count) => sum + count, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground px-6 pt-8 pb-6 rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Pharmacy</h1>
          <button
            onClick={() => navigate("/cart")}
            className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center relative"
          >
            <ShoppingCart className="w-6 h-6" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-xs font-bold rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Products */}
      <div className="px-6 mt-6">
        <h2 className="text-lg font-bold mb-4">💊 Available Medicines</h2>
        <p className="text-sm text-muted-foreground mb-4">Search or scan prescription to find medicines</p>
        <div className="grid grid-cols-2 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="p-4 shadow-card">
              <div className="text-4xl mb-3 text-center">{product.image}</div>
              <h3 className="font-semibold mb-1">{product.name}</h3>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {product.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-primary">${product.price}</span>
                {cart[product.id] ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-medium">{cart[product.id]}</span>
                    <button
                      onClick={() => addToCart(product.id)}
                      className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(product.id)}
                    className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Pharmacy;
