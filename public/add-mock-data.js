// Run this in your browser console to add mock alumni data
function addMockData() {
    // Generate random alumni data
    function generateMockAlumni(count = 20) {
      const programs = [
        "B.Tech Computer Science",
        "B.Tech Electronics",
        "B.Tech Mechanical",
        "BCA",
        "MCA",
        "M.Tech Computer Science",
      ]
  
      const passingYears = ["2018-19", "2019-20", "2020-21", "2021-22", "2022-23"]
  
      const employmentTypes = ["Employed", "Self-employed", "Unemployed", "Studying"]
  
      const alumni = []
  
      for (let i = 0; i < count; i++) {
        const program = programs[Math.floor(Math.random() * programs.length)]
        const passingYear = passingYears[Math.floor(Math.random() * passingYears.length)]
        const employmentType = employmentTypes[Math.floor(Math.random() * employmentTypes.length)]
  
        const alumni_record = {
          _id: Math.random().toString(36).substring(2, 9),
          name: `Alumni ${i + 1}`,
          academicUnit: "School of Science and Technology",
          program,
          passingYear,
          registrationNumber: `SST${2010 + Math.floor(Math.random() * 13)}${String(1000 + i).padStart(4, "0")}`,
          contactDetails: {
            email: `alumni${i + 1}@example.com`,
            phone: `+91${Math.floor(Math.random() * 10000000000)
              .toString()
              .padStart(10, "0")}`,
            address: `Address ${i + 1}, Dehradun, Uttarakhand`,
          },
          employment: {
            type: employmentType,
            employerName: employmentType === "Employed" ? `Company ${i + 1}` : "",
            employerContact:
              employmentType === "Employed"
                ? `+91${Math.floor(Math.random() * 10000000000)
                    .toString()
                    .padStart(10, "0")}`
                : "",
            employerEmail: employmentType === "Employed" ? `company${i + 1}@example.com` : "",
            selfEmploymentDetails: employmentType === "Self-employed" ? `Self-employed business ${i + 1}` : "",
          },
          higherEducation: {
            institutionName: employmentType === "Studying" ? `University ${i + 1}` : "",
            programName: employmentType === "Studying" ? `Program ${i + 1}` : "",
          },
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
          updatedAt: new Date().toISOString(),
        }
  
        alumni.push(alumni_record)
      }
  
      return alumni
    }
  
    try {
      const mockAlumni = generateMockAlumni(20)
      localStorage.setItem("mockAlumni", JSON.stringify(mockAlumni))
      console.log("✅ Mock alumni data added to localStorage")
      console.log("Total alumni:", mockAlumni.length)
  
      // Also add a mock user for testing
      const mockUsers = [
        {
          email: "admin@example.com",
          password: "password123",
          name: "Admin User",
          role: "admin",
        },
      ]
      localStorage.setItem("mockUsers", JSON.stringify(mockUsers))
      console.log("✅ Mock users added to localStorage")
  
      return true
    } catch (error) {
      console.error("❌ Error adding mock data:", error)
      return false
    }
  }
  
  addMockData()
  
  