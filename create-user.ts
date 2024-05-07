#! /usr/bin/env node

import { PrismaClient } from "@prisma/client";
import { program } from "commander";
import { nanoid } from "nanoid";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import autocomplete from "inquirer-autocomplete-standalone";

const prisma = new PrismaClient();

async function getRoles() {
    const roles = await prisma.roles.findMany();

    return roles;
}

interface Role {
    RoleID: string;
    RoleName: string;
    Status: string;
}

async function basicInfo(roles: Role[]) {
    const answers = await inquirer.prompt([
        {
            name: "name",
            message: "Enter full name: ",
            type: "input",
        },
        {
            name: "phoneno",
            message: "Enter phone number: ",
            type: "input",
        },
        {
            name: "email",
            message: "Enter email: ",
            type: "input",
        },
        {
            name: "role",
            message: "Select role(s): ",
            type: "checkbox",
            choices: roles.map((role) => {
                return {
                    name: role.RoleName,
                    value: role.RoleID,
                };
            }),
        },
        {
            name: "icno",
            message: "Enter IC number: ",
            type: "input",
        },
        {
            name: "gender",
            message: "Select a gender: ",
            type: "list",
            choices: ["Male", "Female"],
        },
        {
            name: "dob",
            message: "Enter date of birth: ",
            type: "input",
            default: new Date().toISOString(),
        },
        {
            name: "address",
            message: "Enter address: ",
            type: "input",
            default: "",
        },
        {
            name: "city",
            message: "Enter city: ",
            type: "input",
            default: "",
        },
        {
            name: "zipcode",
            message: "Enter postcode: ",
            type: "input",
            default: "",
        },
        {
            name: "state",
            message: "Enter state: ",
            type: "input",
            default: "",
        },
    ]);

    return answers;
}

const spinner = ora("Getting roles...").start();

const roles = await getRoles();

spinner.stop();

const answers = await basicInfo(roles);

const ans = await inquirer.prompt({
    name: "isTeacher",
    message: "Is this user a teacher?",
    type: "confirm",
});

const askConfirmation = async (branch?: string, classes?: string[]) => {
    console.log(chalk.underline.bold("User Details"));
    console.log(chalk.bold("Name: ") + answers.name);
    console.log(chalk.bold("Phone number: ") + answers.phoneno);
    console.log(chalk.bold("Email: ") + answers.email);
    console.log(chalk.bold("Role: ") + answers.role.join(", "));
    console.log(chalk.bold("IC number: ") + answers.icno);

    console.log(chalk.bold("Date of Birth: ") + answers.dob);
    console.log(chalk.bold("Address: ") + answers.address);
    console.log(chalk.bold("City: ") + answers.city);
    console.log(chalk.bold("Postcode: ") + answers.zipcode);
    console.log(chalk.bold("State: ") + answers.state);

    console.log(chalk.bold("Branch: ") + branch);
    console.log(chalk.bold("Classes: ") + classes?.join(", "));

    const confirmation = await inquirer.prompt({
        name: "confirm",
        message: "Do you want to confirm the details?",
        type: "confirm",
    });

    if (!confirmation.confirm) {
        console.log("User creation cancelled.");
        process.exit(0);
    }

    return confirmation.confirm;
};

const updateDB = async (branchID?: string, classes?: string[]) => {
    const user = await prisma.users.create({
        data: {
            UserID: nanoid(),
            FullName: answers.name,
            MobileNumber: answers.phoneno,
            EmailAddress: answers.email,
            ICNo: answers.icno,
            Gender: answers.gender,
            DOB: new Date(answers.dob),
            Address1: answers.address,
            City: answers.city,
            ZipCode: answers.zipcode,
            State: answers.state,
            Status: "",
            VehicleInfo: "",
            AGClasses: {
                connect: classes?.map((item) => ({
                    ClassID: item,
                })),
            },
            Branch: {
                connect: {
                    BranchID: branchID,
                },
            },
        },
    });
};

if (ans.isTeacher) {

    const spinnerBranch = ora('Getting branches...').start()

    const branches = await prisma.branch.findMany({
        include: {
            AGClasses: true,
        },
    });

    spinnerBranch.stop()

    const branchAnswer = await autocomplete({
        message: "Select teacher's branch(s): ",
        source: async (input) => {
            if (!input) {
                return branches.map((branch) => ({
                    value: `${branch.BranchID} - ${branch.BranchName}`,
                    description: branch.BranchName,
                }));
            }

            const filtered = branches.filter((branch) => {
                return branch.BranchName.toLowerCase().includes(
                    input.toLowerCase()
                );
            });

            return filtered.map((item) => ({
                value: `${item.BranchID} - ${item.BranchName}`,
                description: item.BranchName,
            }));
        },
    });

    const branchID = branchAnswer.split(" - ")[0];

    const classes =
        branches
            .find((branch) => branch.BranchID === branchID)
            ?.AGClasses.map((item) => item.ClassID) ?? [];

    await askConfirmation(branchAnswer, branches
        .find((branch) => branch.BranchID === branchID)
        ?.AGClasses.map((item) => item.ClassName) ?? []);

    try {
        await updateDB(branchID, classes);
    } catch (error: any) {

        if (error instanceof Error) {
            console.error(error.message);
        }

        console.error(error);

    }
} else {
    await askConfirmation();

    try {
        await updateDB();
    } catch (error: any) {

        if (error instanceof Error) {
            console.error(error.message);
        }

        console.error(error);

    }
}

// console.log(roles);
