import { Injectable } from '@nestjs/common';
import { UserService } from './user/user.service';
import { CreateUserDocument, User } from './user/schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Summary, SummaryDocument } from './user/schemas/summary.schema';
const crypto = require('crypto');

@Injectable()
export class AppService {
  private algorithm = 'aes-256-cbc';
  private key = 'symptom-checker-1234567890123456';

  constructor(
    @InjectModel(User.name) private userModel: Model<CreateUserDocument>,
    @InjectModel(Summary.name) private summaryModel: Model<SummaryDocument>,
    private readonly _user: UserService,
  ) {}
  getHello(): string {
    return 'Hello World!';
  }

  encrypt(text) {
    try {
      const jsonString = JSON.stringify(text);
      let iv = crypto.randomBytes(16);
      console.log('============>', iv);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        Buffer.from(this.key),
        iv,
      );
      let encrypted = cipher.update(jsonString, 'utf-8', 'hex');

      this._user.create(encrypted);

      encrypted += cipher.final('hex');
      return { iv: iv.toString('hex'), encryptedData: encrypted };
    } catch (error) {
      console.error(error);
    }
  }

  decrypt(encryptedData, inputIV) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(this.key),
      Buffer.from(inputIV, 'hex'),
    );
    let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  }

  // Example usage

  async invokeEncryption() {
    let json = {
      personalInfo: {
        firstName: 'Aditi',
        lastName: 'Sharma',
        dateOfBirth: '1998-01-01T00:00:00.000Z',
        gender: 'Female',
        contactNumber: '0987654321',
        email: 'aditisharma@example.com',
        address: '123 Main St, Anytown, USA',
      },
      healthInfo: {
        medicalConditions: ['Obesity'],
        medications: [],
        allergies: ['Dust'],
        surgeries: [],
        familyMedicalHistory: [],
        vaccinationRecords: ['COVID-19', 'Flu'],
      },
      lifestyleInfo: {
        dietaryPreferences: 'Balanced',
        exerciseHabits: 'Regular',
        smokingStatus: false,
        alcoholConsumption: true,
      },
      bloodSugarLevels: [
        {
          date: '2024-07-30T07:00:00.000Z',
          level: 150,
        },
      ],
      bloodPressure: [
        {
          date: '2024-07-30T07:00:00.000Z',
          systolic: 120,
          diastolic: 80,
        },
      ],
      weight: [
        {
          date: '2024-07-30T07:00:00.000Z',
          weight: 70, // example value
        },
      ],
      symptomLogs: [
        {
          date: '2024-07-30T07:00:00.000Z',
          description: 'Excessive thirst',
        },
        {
          date: '2024-07-30T07:00:00.000Z',
          description: 'Frequent urination',
        },
      ],
      dailyActivityLogs: [
        {
          date: '2024-07-30T07:00:00.000Z',
          activity: 'Walking',
          duration: 30,
        },
      ],
      appointmentInfo: {
        upcomingAppointments: [],
        pastAppointments: [],
        treatmentPlans: ['Healthy diet', 'Regular exercise'],
        prescriptions: [
          {
            name: 'JALRA-M',
            dosage: 'As prescribed',
            schedule: 'As prescribed',
          },
          {
            name: 'Glycomet GP',
            dosage: 'As prescribed',
            schedule: 'As prescribed',
          },
        ],
      },
      insuranceInfo: {
        insuranceProvider: 'Onsurity',
        policyNumber: 'XYZ987654',
        coverageDetails: 'Full coverage for diabetes treatment',
      },
      emergencyContacts: [
        {
          name: 'John Doe',
          relationship: 'Friend',
          phoneNumber: '1234567890',
        },
      ],
      technicalInfo: {
        language: 'English',
        notificationSettings: 'Email and SMS',
        appUsageHistory: [
          {
            date: '2024-07-29T12:00:00.000Z',
            action: 'Logged in',
          },
        ],
        deviceInfo: 'iPhone 12',
      },
      consent: {
        consentForDataSharing: true,
        hipaaComplianceAcknowledged: true,
        termsOfServiceAgreed: true,
        privacyPolicyAgreed: true,
      },
    };
    const encryptedData = await this.encrypt(json);
    console.log('Encrypted:', encryptedData);
    const decryptedText = await this.decrypt(
      encryptedData.encryptedData,
      encryptedData.iv,
    );
    console.log('Decrypted:', decryptedText);
  }
}
