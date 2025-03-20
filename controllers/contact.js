import Contact from '../models/contact.js';

// @desc    Submit a contact form message
// @route   POST /api/contact
// @access  Public
export const sendContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Create new contact message
    const newContact = new Contact({
      name,
      email,
      subject,
      message,
      createdAt: new Date()
    });
    
    // Save to database
    await newContact.save();
    
    res.status(201).json({ 
      success: true,
      message: 'Contact message received successfully' 
    });
  } catch (error) {
    console.error('Error saving contact message:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Private/Admin
export const getContactMessages = async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ message: error.message });
  }
};
