import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Alumni from './models/alumni.js';
import AcademicUnit from './models/academicUnit.js';
import User from './models/user.js';

// Load environment variables
dotenv.config();

const migrateData = async () => {
  try {
    console.log('🚀 Starting migration...');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find the first user (typically admin)
    const firstUser = await User.findOne().sort({ createdAt: 1 });
    
    if (!firstUser) {
      console.error('❌ No users found in database!');
      console.log('💡 Please create a user first, then run this migration.');
      process.exit(1);
    }

    console.log(`👤 Found user: ${firstUser.name} (${firstUser.email})`);
    console.log(`🔑 User ID: ${firstUser._id}`);

    // Update Alumni records without createdBy
    console.log('\n📚 Updating Alumni records...');
    const alumniWithoutUser = await Alumni.find({ 
      $or: [
        { createdBy: { $exists: false } },
        { createdBy: null }
      ]
    });
    
    console.log(`Found ${alumniWithoutUser.length} alumni records without user assignment`);
    
    if (alumniWithoutUser.length > 0) {
      const alumniResult = await Alumni.updateMany(
        { 
          $or: [
            { createdBy: { $exists: false } },
            { createdBy: null }
          ]
        },
        { $set: { createdBy: firstUser._id } }
      );
      console.log(`✅ Updated ${alumniResult.modifiedCount} alumni records`);
    } else {
      console.log('✅ All alumni records already have user assignment');
    }

    // Update Academic Unit records without createdBy
    console.log('\n🏛️  Updating Academic Unit records...');
    const unitsWithoutUser = await AcademicUnit.find({ 
      $or: [
        { createdBy: { $exists: false } },
        { createdBy: null }
      ]
    });
    
    console.log(`Found ${unitsWithoutUser.length} academic units without user assignment`);
    
    if (unitsWithoutUser.length > 0) {
      const unitResult = await AcademicUnit.updateMany(
        { 
          $or: [
            { createdBy: { $exists: false } },
            { createdBy: null }
          ]
        },
        { $set: { createdBy: firstUser._id } }
      );
      console.log(`✅ Updated ${unitResult.modifiedCount} academic unit records`);
    } else {
      console.log('✅ All academic units already have user assignment');
    }

    // Drop old unique indexes
    console.log('\n🔧 Updating database indexes...');
    try {
      // Drop old unique index on Alumni.registrationNumber
      await Alumni.collection.dropIndex('registrationNumber_1');
      console.log('✅ Dropped old registrationNumber unique index');
    } catch (error) {
      if (error.code !== 27) { // 27 = IndexNotFound
        console.log('⚠️  Old registrationNumber index not found (already removed or never existed)');
      }
    }

    try {
      // Drop old unique index on AcademicUnit.name
      await AcademicUnit.collection.dropIndex('name_1');
      console.log('✅ Dropped old name unique index');
    } catch (error) {
      if (error.code !== 27) {
        console.log('⚠️  Old name index not found (already removed or never existed)');
      }
    }

    // Create new compound unique indexes
    console.log('🔧 Creating new compound indexes...');
    
    // Ensure compound unique index on Alumni
    await Alumni.collection.createIndex(
      { registrationNumber: 1, createdBy: 1 }, 
      { unique: true, background: true }
    );
    console.log('✅ Created compound index: registrationNumber + createdBy');

    // Ensure compound unique index on AcademicUnit
    await AcademicUnit.collection.createIndex(
      { name: 1, createdBy: 1 }, 
      { unique: true, background: true }
    );
    console.log('✅ Created compound index: name + createdBy');

    console.log('\n✨ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Alumni records updated: ${alumniWithoutUser.length}`);
    console.log(`   - Academic units updated: ${unitsWithoutUser.length}`);
    console.log(`   - All assigned to: ${firstUser.name} (${firstUser.email})`);
    console.log('\n🎉 User isolation is now active!');
    console.log('🔒 Each user will now only see their own data.');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
migrateData();
