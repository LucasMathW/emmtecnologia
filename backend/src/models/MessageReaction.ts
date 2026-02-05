import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt
} from "sequelize-typescript";

import Message from "./Message";
import User from "./User";

@Table({
  tableName: "MessageReactions",
  timestamps: true
})
class MessageReaction extends Model<MessageReaction> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true
  })
  id!: number;

  @ForeignKey(() => Message)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  messageId!: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  userId!: number;

  @Column({
    type: DataType.STRING(10),
    allowNull: false
  })
  emoji!: string;

  // @BelongsTo(() => Message)
  // message!: Message;

  // @BelongsTo(() => User)
  // user!: User;

  @BelongsTo(() => Message, {
    foreignKey: "messageId",
    as: "message"
  })
  message!: Message;

  @BelongsTo(() => User, {
    foreignKey: "userId",
    as: "user"
  })
  user!: User;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  fromJid!: string;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}

export default MessageReaction;
