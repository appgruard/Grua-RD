import bcrypt from "bcryptjs";
import { db, pool } from "./db";
import { users, conductores, documentos } from "@shared/schema";

interface TestUser {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  userType: "cliente" | "conductor" | "admin" | "aseguradora" | "socio" | "empresa";
  phone?: string;
  cedula?: string;
  conductorData?: {
    licencia: string;
    placaGrua: string;
    marcaGrua: string;
    modeloGrua: string;
    ubicacionLat?: string;
    ubicacionLng?: string;
  };
}

const testUsers: TestUser[] = [
  {
    email: "admin@fourone.com.do",
    password: "PSzorro99**",
    nombre: "Administrador",
    apellido: "FourOne",
    userType: "admin",
    phone: "8091234567",
    cedula: "00100000001",
  },
  {
    email: "cliente@test.com",
    password: "Test123456!",
    nombre: "Carlos",
    apellido: "Martínez",
    userType: "cliente",
    phone: "8092345678",
    cedula: "00200000002",
  },
  {
    email: "conductor1@test.com",
    password: "Test123456!",
    nombre: "Juan",
    apellido: "Pérez",
    userType: "conductor",
    phone: "8093456789",
    cedula: "00300000003",
    conductorData: {
      licencia: "LIC-001-2024",
      placaGrua: "G123456",
      marcaGrua: "Ford",
      modeloGrua: "F-350",
      ubicacionLat: "18.4861",
      ubicacionLng: "-69.9312",
    },
  },
  {
    email: "conductor2@test.com",
    password: "Test123456!",
    nombre: "Miguel",
    apellido: "Santos",
    userType: "conductor",
    phone: "8094567890",
    cedula: "00400000004",
    conductorData: {
      licencia: "LIC-002-2024",
      placaGrua: "G789012",
      marcaGrua: "Chevrolet",
      modeloGrua: "Silverado 3500",
      ubicacionLat: "18.4500",
      ubicacionLng: "-69.9800",
    },
  },
  {
    email: "conductor3@test.com",
    password: "Test123456!",
    nombre: "Roberto",
    apellido: "García",
    userType: "conductor",
    phone: "8095678901",
    cedula: "00500000005",
    conductorData: {
      licencia: "LIC-003-2024",
      placaGrua: "G345678",
      marcaGrua: "Dodge",
      modeloGrua: "Ram 3500",
      ubicacionLat: "18.5100",
      ubicacionLng: "-69.8900",
    },
  },
  {
    email: "aseguradora@test.com",
    password: "Test123456!",
    nombre: "Seguros",
    apellido: "Dominicanos",
    userType: "aseguradora",
    phone: "8096789012",
    cedula: "00600000006",
  },
  {
    email: "socio@test.com",
    password: "Test123456!",
    nombre: "Pedro",
    apellido: "Ramírez",
    userType: "socio",
    phone: "8097890123",
    cedula: "00700000007",
  },
  {
    email: "empresa@test.com",
    password: "Test123456!",
    nombre: "Empresa",
    apellido: "Transportes SA",
    userType: "empresa",
    phone: "8098901234",
    cedula: "00800000008",
  },
];

async function seedTestUsers(): Promise<void> {
  console.log("Starting test users seed...\n");

  for (const testUser of testUsers) {
    try {
      const existingUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, testUser.email),
      });

      if (existingUser) {
        console.log(`User ${testUser.email} already exists, skipping...`);
        continue;
      }

      const passwordHash = await bcrypt.hash(testUser.password, 10);

      const [createdUser] = await db
        .insert(users)
        .values({
          email: testUser.email,
          passwordHash,
          nombre: testUser.nombre,
          apellido: testUser.apellido,
          userType: testUser.userType,
          phone: testUser.phone,
          cedula: testUser.cedula,
          estadoCuenta: "activo",
          cedulaVerificada: true,
          telefonoVerificado: true,
          fotoVerificada: true,
          fotoVerificadaScore: "0.95",
          calificacionPromedio: "4.50",
        })
        .returning();

      console.log(`Created user: ${testUser.email} (${testUser.userType})`);

      if (testUser.userType === "conductor" && testUser.conductorData) {
        const [createdConductor] = await db
          .insert(conductores)
          .values({
            userId: createdUser.id,
            licencia: testUser.conductorData.licencia,
            placaGrua: testUser.conductorData.placaGrua,
            marcaGrua: testUser.conductorData.marcaGrua,
            modeloGrua: testUser.conductorData.modeloGrua,
            disponible: true,
            ubicacionLat: testUser.conductorData.ubicacionLat,
            ubicacionLng: testUser.conductorData.ubicacionLng,
            ultimaUbicacionUpdate: new Date(),
            balanceDisponible: "500.00",
            balancePendiente: "0.00",
          })
          .returning();

        console.log(`  -> Created conductor profile for ${testUser.email}`);

        const documentTypes = [
          { tipo: "licencia" as const, nombre: "licencia_conducir.pdf" },
          { tipo: "cedula_frontal" as const, nombre: "cedula_frontal.jpg" },
          { tipo: "cedula_trasera" as const, nombre: "cedula_trasera.jpg" },
          { tipo: "matricula" as const, nombre: "matricula_vehiculo.pdf" },
          { tipo: "seguro_grua" as const, nombre: "seguro_grua.pdf" },
          { tipo: "foto_vehiculo" as const, nombre: "foto_grua.jpg" },
          { tipo: "foto_perfil" as const, nombre: "foto_perfil.jpg" },
        ];

        for (const doc of documentTypes) {
          await db.insert(documentos).values({
            tipo: doc.tipo,
            usuarioId: createdUser.id,
            conductorId: createdConductor.id,
            url: `https://storage.example.com/docs/${createdUser.id}/${doc.nombre}`,
            nombreArchivo: doc.nombre,
            tamanoArchivo: 1024000,
            mimeType: doc.nombre.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
            estado: "aprobado",
            validoHasta: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            verifikValidado: true,
            verifikScore: "0.950",
            verifikTipoValidacion: "auto",
            verifikFechaValidacion: new Date(),
          });
        }

        console.log(`  -> Created ${documentTypes.length} verified documents for ${testUser.email}`);
      }
    } catch (error) {
      console.error(`Error creating user ${testUser.email}:`, error);
    }
  }

  console.log("\nTest users seed completed!");
}

// Run the seed function
seedTestUsers()
  .then(() => {
    console.log("\nSeed script finished successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed script failed:", error);
    process.exit(1);
  });
