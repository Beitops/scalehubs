import { create } from 'zustand'

interface Lead {
  id: number
  date: string
  name: string
  phone: string
  platform: string
  company: string
}

interface LeadsState {
  leads: Lead[]
  getLeadsByCompany: (company: string) => Lead[]
  getAllLeads: () => Lead[]
}

// Leads de prueba con diferentes empresas
const mockLeads: Lead[] = [
  // Leads para Empresa 1
  { id: 1, date: '2024-01-15', name: 'María González', phone: '+34 612 345 678', platform: 'Instagram', company: 'Empresa 1' },
  { id: 2, date: '2024-01-15', name: 'Carlos Ruiz', phone: '+34 623 456 789', platform: 'Facebook', company: 'Empresa 1' },
  { id: 3, date: '2024-01-14', name: 'Ana Martínez', phone: '+34 634 567 890', platform: 'LinkedIn', company: 'Empresa 1' },
  { id: 4, date: '2024-01-14', name: 'Luis Pérez', phone: '+34 645 678 901', platform: 'Instagram', company: 'Empresa 1' },
  { id: 5, date: '2024-01-13', name: 'Sofia Rodriguez', phone: '+34 656 789 012', platform: 'Facebook', company: 'Empresa 1' },
  { id: 6, date: '2024-01-13', name: 'Diego Morales', phone: '+34 667 890 123', platform: 'LinkedIn', company: 'Empresa 1' },
  { id: 7, date: '2024-01-12', name: 'Carmen Vega', phone: '+34 678 901 234', platform: 'Instagram', company: 'Empresa 1' },
  { id: 8, date: '2024-01-12', name: 'Roberto Silva', phone: '+34 689 012 345', platform: 'Facebook', company: 'Empresa 1' },

  // Leads para Empresa 2
  { id: 9, date: '2024-01-15', name: 'Laura Fernandez', phone: '+34 690 123 456', platform: 'Instagram', company: 'Empresa 2' },
  { id: 10, date: '2024-01-15', name: 'Miguel Torres', phone: '+34 601 234 567', platform: 'Facebook', company: 'Empresa 2' },
  { id: 11, date: '2024-01-14', name: 'Elena Castro', phone: '+34 612 345 678', platform: 'LinkedIn', company: 'Empresa 2' },
  { id: 12, date: '2024-01-14', name: 'Pedro Jimenez', phone: '+34 623 456 789', platform: 'Instagram', company: 'Empresa 2' },
  { id: 13, date: '2024-01-13', name: 'Isabel Moreno', phone: '+34 634 567 890', platform: 'Facebook', company: 'Empresa 2' },
  { id: 14, date: '2024-01-13', name: 'Francisco Lopez', phone: '+34 645 678 901', platform: 'LinkedIn', company: 'Empresa 2' },
  { id: 15, date: '2024-01-12', name: 'Patricia Ramos', phone: '+34 656 789 012', platform: 'Instagram', company: 'Empresa 2' },
  { id: 16, date: '2024-01-12', name: 'Antonio Herrera', phone: '+34 667 890 123', platform: 'Facebook', company: 'Empresa 2' },
  { id: 17, date: '2024-01-11', name: 'Rosa Mendoza', phone: '+34 678 901 234', platform: 'LinkedIn', company: 'Empresa 2' },
  { id: 18, date: '2024-01-11', name: 'Javier Ortega', phone: '+34 689 012 345', platform: 'Instagram', company: 'Empresa 2' },
  { id: 19, date: '2024-01-10', name: 'Monica Vargas', phone: '+34 690 123 456', platform: 'Facebook', company: 'Empresa 2' },
  { id: 20, date: '2024-01-10', name: 'Ricardo Flores', phone: '+34 601 234 567', platform: 'LinkedIn', company: 'Empresa 2' },
]

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: mockLeads,

  getLeadsByCompany: (company: string) => {
    return get().leads.filter(lead => lead.company === company)
  },

  getAllLeads: () => {
    return get().leads
  }
})) 