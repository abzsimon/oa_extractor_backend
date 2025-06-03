    const mongoose = require('mongoose');
    const Schema = mongoose.Schema

    const userSchema = new Schema(
    {
        // Le compte est inactif par défaut : on l’activera manuellement
        isActive: {
        type: Boolean,
        default: false,
        required: true,
        },

        // On stocke uniquement le hash (bcrypt, Argon2…)
        passwordHash: {
        type: String,
        required: true,
        minlength: 60, // un hash bcrypt fait forcément 60 charactères, donc sécurité en plus
        },

        // prénom
        username: {
        type: String,
        required: true,
        trim: true,
        unique : true,
        minlength: 1,
        maxlength: 100,
        },

        // Rôle : soit "user" soit "admin"
        role: {
        type: String,
        enum: ['user', 'admin'],
        required: true,
        default: 'user',
        },

        // Date de la dernière connexion (null si jamais connecté)
        lastLogin: {
        type: Date,
        default: null,
        },

        // Référence aux projets (un utilisateur peut appartenir à plusieurs projets)
        projectIds: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
        },
        ],
    },
    {
        timestamps: true, // créé automatiquement createdAt et updatedAt
    }
    );

    const User = mongoose.model('users', userSchema)

    module.exports = User
