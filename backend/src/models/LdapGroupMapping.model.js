import mongoose from 'mongoose';
import { normalizeDN } from '../utils/ldap.utils.js';

const ldapGroupMappingSchema = new mongoose.Schema({
  ldapGroupDN: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  normalizedDN: {
    type: String,
    index: true
  },
  ldapGroupName: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  gedGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  supervisorServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  priority: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Calcule le DN normalisé pour faciliter la correspondance avec l'attribut memberOf
ldapGroupMappingSchema.pre('save', function (next) {
  if (this.ldapGroupDN) {
    this.normalizedDN = normalizeDN(this.ldapGroupDN);
  }
  next();
});

const LdapGroupMapping = mongoose.model('LdapGroupMapping', ldapGroupMappingSchema);

export default LdapGroupMapping;
