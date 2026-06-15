import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      return !this.ldapUser && !this.kerberosUser;
    },
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  // Services accordés via une correspondance LDAP (Administration > Correspondances LDAP).
  // Permet de retirer ces services au login suivant si l'utilisateur quitte le groupe AD
  // correspondant, sans toucher aux services attribués manuellement.
  ldapManagedServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  // Services dont l'utilisateur est superviseur via une correspondance LDAP "Devient superviseur de".
  // Permet de retirer cette supervision au login suivant si l'utilisateur quitte le groupe AD correspondant.
  ldapSupervisedServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  ldapUser: {
    type: Boolean,
    default: false
  },
  kerberosUser: {
    type: Boolean,
    default: false
  },
  ldapDN: {
    type: String,
    default: null
  },
  // true si isActive=false a été positionné automatiquement par la synchronisation périodique
  // du groupe LDAP requis (l'utilisateur a quitté LDAP_REQUIRED_GROUP_DN), et non par un
  // administrateur. Permet de réactiver automatiquement le compte s'il réintègre ce groupe,
  // sans toucher aux désactivations manuelles (Administration > Utilisateurs).
  deactivatedByLdapSync: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index pour la recherche
userSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

// Hash du mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour obtenir le nom complet
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Inclure les virtuels lors de la conversion en JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User;
