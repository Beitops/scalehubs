interface SidebarProps {
  currentSection: string
  setCurrentSection: (section: string) => void
}

const Sidebar = ({ currentSection, setCurrentSection }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'leads', label: 'Leads', icon: '👥' },
  ]

  return (
    <div className="w-64 bg-white shadow-lg">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-[#373643]">
          <span className="text-[#18cb96]">Scale</span>Hubs
        </h1>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-6">
        <ul className="space-y-2 px-4">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setCurrentSection(item.id)}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  currentSection === item.id
                    ? 'bg-[#18cb96] text-white'
                    : 'text-[#373643] hover:bg-gray-100'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info */}
      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-[#18cb96] rounded-full flex items-center justify-center text-white font-bold">
            U
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-[#373643]">Usuario</p>
            <p className="text-xs text-gray-500">usuario@empresa.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar 