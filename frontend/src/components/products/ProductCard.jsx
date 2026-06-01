import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Leaf, Users, Shield } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function ProductCard({ product }) {
  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-600 bg-green-50 ring-green-500/20';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 ring-yellow-500/20';
    return 'text-red-600 bg-red-50 ring-red-500/20';
  };

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-1">
              {product.category}
            </p>
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {product.product_name}
            </h3>
          </div>
          <span className={cn(
            "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
            getScoreColor(product.public_sentiment_score)
          )}>
            Score: {Math.round(product.public_sentiment_score)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-600">
            <Leaf className="w-4 h-4 mr-2 text-green-500" />
            <span>Env: {Math.round(product.environmental_impact)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2 text-blue-500" />
            <span>Labor: {Math.round(product.labor_rights)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Activity className="w-4 h-4 mr-2 text-orange-500" />
            <span>Animal: {Math.round(product.animal_welfare)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Shield className="w-4 h-4 mr-2 text-purple-500" />
            <span>Gov: {Math.round(product.corporate_governance)}</span>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center">
        <span className="font-semibold text-gray-900">${product.product_price.toFixed(2)}</span>
        <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
          View Insights &rarr;
        </button>
      </div>
    </div>
  );
}