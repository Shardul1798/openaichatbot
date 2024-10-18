import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, CreateUserDocument } from './schemas/user.schema';
import { Summary, SummaryDocument } from 'src/user/schemas/summary.schema';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<CreateUserDocument>,
    @InjectModel(Summary.name) private summaryModel: Model<SummaryDocument>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const createdUser = new this.userModel(createUserDto);
    return await createdUser.save();
  }

  async findOne(id: string) {
    const user = await this.userModel
      .findById(id, {
        'personalInfo.firstName': 1,
        'personalInfo.lastName': 1,
        'personalInfo.dateOfBirth': 1,
        'personalInfo.gender': 1,
        'lifestyleInfo.smokingStatus': 1,
        'lifestyleInfo.alcoholConsumption': 1,
      })
      .lean()
      .exec();
    return {
      firstName: user.personalInfo.firstName,
      lastName: user.personalInfo.lastName,
      dateOfBirth: user.personalInfo.dateOfBirth,
      gender: user.personalInfo.gender,
      smokingStatus: user.lifestyleInfo.smokingStatus,
      alcoholConsumption: user.lifestyleInfo.alcoholConsumption,
    };
  }

  async findOneSummary(id: string) {
    return await this.summaryModel.find({sessionId: new ObjectId(id)});
  }

  async saveSummary(session) {
    try {
      return await this.summaryModel.create(session);
    } catch (error) {
      console.error(error);
    }
  }

  async increaseUtilisedToken(id: string, token: number) {
    try {
      return await this.summaryModel.updateOne(
        {
          sessionId: new ObjectId(id),
        },
        {
          $inc: {
            utilisedTokens: token,
          },
        },
        { upsert: true },
      );
    } catch (error) {
      console.error(error);
    }
  }
}
