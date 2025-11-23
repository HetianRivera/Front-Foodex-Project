import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ChefHat, Clock, Users } from 'lucide-react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardFooter } from './DashboardFooter';

export function Dashboard({ user, recipes, onLogout, onSelectRecipe, onStartNewRecipe }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader user={user} onLogout={onLogout} />

      {/* Stats */}
      <div className="container mx-auto max-w-6xl p-8">
        <div className="grid grid-cols-3 gap-6 mb-10">
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="flex items-center gap-5">
                <div className="bg-primary/10 p-4 rounded-xl">
                  <ChefHat className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <p className="text-lg text-slate-600 mb-1">Recetas del Semestre</p>
                  <p className="text-2xl">{recipes.length}/10</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="flex items-center gap-5">
                <div className="bg-blue-100 p-4 rounded-xl">
                  <Clock className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg text-slate-600 mb-1">Tiempo Promedio</p>
                  <p className="text-2xl">
                    {Math.round(recipes.reduce((sum, r) => sum + r.tiempo, 0) / recipes.length)} min
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="flex items-center gap-5">
                <div className="bg-green-100 p-4 rounded-xl">
                  <Users className="w-10 h-10 text-green-600" />
                </div>
                <div>
                  <p className="text-lg text-slate-600 mb-1">Rol Actual</p>
                  <p className="text-2xl"> {user.role === 'profesor' ? 'Profesor' : 'Alumno'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recipe List */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl text-slate-900">Recetas del Taller</h2>
            {user.role === 'profesor' && (
              <Button size="lg" className="text-xl px-8 py-6" onClick={onStartNewRecipe}>+ Nueva Receta</Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8">
            {recipes.map((recipe) => (
              <Card 
                key={recipe.id}
                className="hover:shadow-xl transition-shadow cursor-pointer border-2"
                onClick={() => onSelectRecipe(recipe.id)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <CardTitle className="text-2xl line-clamp-2 leading-tight">{recipe.nombre}</CardTitle>
                    <Badge variant="outline" className="text-base px-3 py-1">{recipe.codigo}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="text-lg text-slate-600 line-clamp-2 leading-relaxed">{recipe.argumentacionComercial}</p>
                  
                  <div className="flex items-center gap-6 text-base text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      <span className="text-lg">{recipe.tiempo} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      <span className="text-lg">{recipe.porcion} porción</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-base px-3 py-1">{recipe.categoria}</Badge>
                    {recipe.tecnicasBase.slice(0, 2).map((tecnica, idx) => (
                      <Badge key={idx} variant="outline" className="text-sm px-2 py-1">
                        {tecnica}
                      </Badge>
                    ))}
                  </div>

                  <Button className="w-full text-xl py-6 mt-4">Ver Ficha Técnica</Button>
                </CardContent>
              </Card>
            ))}

            {/* Placeholders removed per user request */}
          </div>
        </div>
      </div>
      <DashboardFooter />
    </div>
  );
}
