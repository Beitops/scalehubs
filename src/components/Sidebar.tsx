
interface SidebarProps {
  currentSection: string
  setCurrentSection: (section: string) => void
  onClose?: () => void
}

const Sidebar = ({ currentSection, setCurrentSection, onClose}: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'leads', label: 'Leads', icon: '👥' },
  ]

  const handleMenuClick = (section: string) => {
    setCurrentSection(section)
    // Close sidebar on mobile after menu selection
    if (onClose) {
      onClose()
    }
  }


  



  return (
    <div className="w-64 bg-white shadow-lg h-full flex flex-col">
      {/* Header with close button for mobile */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#373643]">
          <span className="text-[#18cb96]">Scale</span>Hubs
        </h1>
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="lg:hidden text-[#373643] hover:text-[#18cb96] focus:outline-none"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-6 flex-1">
        <ul className="space-y-2 px-4">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${currentSection === item.id
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
      <div className="p-4 border-t border-gray-200">
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