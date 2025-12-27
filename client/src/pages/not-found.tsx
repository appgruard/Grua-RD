import { Card, CardContent } from "@/components/ui/card"; import { AlertTriangle, Wrench, Truck } from "lucide-react"; import { motion } from "framer-motion";

export default function NotFound() { return ( <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800"> <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md mx-4" > <Card className="bg-black/70 border border-gray-700 shadow-2xl rounded-2xl"> <CardContent className="pt-8 pb-6 text-center"> {/* Icono principal */} <div className="flex justify-center mb-6 relative"> <Truck className="h-20 w-20 text-yellow-500" /> <Wrench className="h-8 w-8 text-red-500 absolute -bottom-1 -right-1 rotate-12" /> </div>

{/* Título */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <h1 className="text-3xl font-bold text-white">404</h1>
        </div>

        <p className="text-lg font-semibold text-gray-200">
          Grúa fuera de servicio
        </p>

        {/* Descripción */}
        <p className="mt-4 text-sm text-gray-400 leading-relaxed">
          La ruta que buscas no existe o esta grúa sufrió una avería en el camino.
          Nuestro equipo ya está trabajando para ponerla de vuelta en marcha.
        </p>

        {/* Línea decorativa */}
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-gray-600 to-transparent" />

        {/* Mensaje final */}
        <p className="mt-4 text-xs text-gray-500">
          Verifica la dirección o regresa al inicio.
        </p>
      </CardContent>
    </Card>
  </motion.div>
</div>

); }